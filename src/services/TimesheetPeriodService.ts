import { injectable, inject } from 'inversify'
import { WhereOptions } from 'sequelize'
import { ITimesheetPeriodService } from '../interfaces/service/ITimesheetPeriodService'
import { ITimesheetPeriodRepository } from '../interfaces/repository/ITimesheetPeriodRepository'
import { TimesheetPeriod } from '../models/TimesheetPeriod'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	CreateTimesheetPeriodDTO,
	TimesheetPeriodFilterOptions,
	TimesheetPeriodResponseDTO,
} from '../types/timesheetPeriodTypes'

@injectable()
export class TimesheetPeriodService implements ITimesheetPeriodService {
	constructor(
		@inject(TYPES.ITimesheetPeriodRepository)
		private timesheetPeriodRepository: ITimesheetPeriodRepository
	) {}

	private toResponseDTO(period: TimesheetPeriod): TimesheetPeriodResponseDTO {
		const plain = period.get({ plain: true })
		return {
			id: plain.id,
			startDate: plain.startDate,
			endDate: plain.endDate,
			isLocked: plain.isLocked,
			lockedAt: plain.lockedAt ?? null,
			lockedBy: plain.lockedBy ?? null,
		}
	}

	/** `startDate`/`endDate` are validated as `YYYY-MM-DD` by
	 * `timesheetPeriodSchema` before reaching the service, so a plain string
	 * comparison here is safe and avoids the timezone-shift pitfalls of
	 * parsing a `DATEONLY` string through `Date`. */
	private assertValidDateRange(startDate: string, endDate: string): void {
		if (endDate < startDate) {
			throw new AppException('endDate cannot be before startDate', 400)
		}
	}

	/** `year`/`month` are denormalized onto the row purely to back the
	 * `GetAllTimesheetPeriods` filters with a plain equality lookup (see the
	 * migration note on these columns) — derived here, at write time, from
	 * `startDate` so they never need to be supplied by the caller. */
	private deriveYearMonth(startDate: string): { year: number; month: number } {
		const [year, month] = startDate.split('-').map((part) => parseInt(part, 10))
		return { year, month }
	}

	public async getAllTimesheetPeriods(
		options: TimesheetPeriodFilterOptions
	): Promise<TimesheetPeriodResponseDTO[]> {
		const { isLocked, year, month } = options

		const whereClause: WhereOptions = {
			...(isLocked !== undefined && { isLocked }),
			...(year !== undefined && { year }),
			...(month !== undefined && { month }),
		}

		const periods = await this.timesheetPeriodRepository.find({
			where: whereClause,
			order: [['startDate', 'ASC']],
		})

		return periods.map((period) => this.toResponseDTO(period))
	}

	public async getTimesheetPeriodById(
		id: number
	): Promise<TimesheetPeriodResponseDTO> {
		const period = await this.timesheetPeriodRepository.findByPk(id)

		if (!period) {
			throw new AppException('Timesheet period not found', 404)
		}

		return this.toResponseDTO(period)
	}

	public async createTimesheetPeriod(
		periodData: CreateTimesheetPeriodDTO
	): Promise<TimesheetPeriodResponseDTO> {
		const { startDate, endDate } = periodData

		this.assertValidDateRange(startDate, endDate)

		// Application-level pre-check for the common case; concurrent inserts
		// racing this check are not prevented by a DB constraint (MySQL has no
		// exclusion constraints, so overlap enforcement stays here — see the
		// migration note on `timesheet_periods_start_date_end_date_idx`).
		const overlapping = await this.timesheetPeriodRepository.findOverlapping(
			startDate,
			endDate
		)
		if (overlapping) {
			throw new AppException(
				'A timesheet period overlapping this date range already exists',
				409
			)
		}

		const { year, month } = this.deriveYearMonth(startDate)

		const period = await sequelize.transaction(async (transaction) => {
			return this.timesheetPeriodRepository.create(
				{ startDate, endDate, year, month },
				{ transaction }
			)
		})

		if (!period) {
			throw new AppException('Failed to create timesheet period', 500)
		}

		return this.toResponseDTO(period)
	}

	public async lockTimesheetPeriod(
		id: number,
		lockedByUserId: number
	): Promise<TimesheetPeriodResponseDTO> {
		const period = await this.timesheetPeriodRepository.findByPk(id)
		if (!period) {
			throw new AppException('Timesheet period not found', 404)
		}

		if (period.isLocked) {
			throw new AppException('Timesheet period is already locked', 409)
		}

		const updated = await sequelize.transaction(async (transaction) => {
			return period.update(
				{ isLocked: true, lockedAt: new Date(), lockedBy: lockedByUserId },
				{ transaction }
			)
		})

		return this.toResponseDTO(updated)
	}

	public async unlockTimesheetPeriod(
		id: number
	): Promise<TimesheetPeriodResponseDTO> {
		const period = await this.timesheetPeriodRepository.findByPk(id)
		if (!period) {
			throw new AppException('Timesheet period not found', 404)
		}

		if (!period.isLocked) {
			throw new AppException('Timesheet period is already unlocked', 409)
		}

		const updated = await sequelize.transaction(async (transaction) => {
			return period.update(
				{ isLocked: false, lockedAt: null, lockedBy: null },
				{ transaction }
			)
		})

		return this.toResponseDTO(updated)
	}

	public async deleteTimesheetPeriod(id: number): Promise<boolean> {
		const period = await this.timesheetPeriodRepository.findByPk(id)
		if (!period) {
			return false
		}

		// Note: `timesheet_periods` has no incoming foreign keys yet in this
		// codebase (no TimesheetEntry model/association exists — Module 4).
		// The API spec's `409 period has existing timesheet entries` guard
		// belongs here once that association is introduced, mirroring
		// `ProjectService.deleteProject`'s identical note.
		const deletedCount = await this.timesheetPeriodRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}
}
