import { injectable, inject } from 'inversify'
import { Op, WhereOptions } from 'sequelize'
import { ITimesheetEntryService } from '../interfaces/service/ITimesheetEntryService'
import { ITimesheetEntryRepository } from '../interfaces/repository/ITimesheetEntryRepository'
import { IProjectRepository } from '../interfaces/repository/IProjectRepository'
import { IProjectResourceAssignmentRepository } from '../interfaces/repository/IProjectResourceAssignmentRepository'
import { ITimesheetPeriodRepository } from '../interfaces/repository/ITimesheetPeriodRepository'
import { TimesheetEntry } from '../models/TimesheetEntry'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { TimesheetPeriod } from '../models/TimesheetPeriod'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	ApproveTimesheetEntryResponseDTO,
	BulkApproveResultDTO,
	CreateTimesheetEntryDTO,
	DailySummaryDTO,
	TimesheetEntryCreateResponseDTO,
	TimesheetEntryDetailDTO,
	TimesheetEntryFilterOptions,
	TimesheetEntryListItemDTO,
	TimesheetEntryListResultDTO,
	UpdateTimesheetEntryDTO,
	WeeklySummaryDTO,
} from '../types/timesheetEntryTypes'

// `maxDailyHours` is only consumed by `updateTimesheetEntry`'s hours-cap
// re-validation (it's dropped again by `toDetailDTO`/`toListItemDTO`, which
// only project `id`/`code`/`name` into their DTOs) — included here so
// `getTimesheetEntryById`/`updateTimesheetEntry` don't need a second query
// just for the project's cap.
const ENTRY_INCLUDE = [
	{ model: User, as: 'user', attributes: ['id', 'name'] },
	{
		model: Project,
		as: 'project',
		attributes: ['id', 'code', 'name', 'maxDailyHours'],
	},
	{
		model: TimesheetPeriod,
		as: 'timesheetPeriod',
		attributes: ['id', 'startDate', 'endDate', 'isLocked'],
	},
]

@injectable()
export class TimesheetEntryService implements ITimesheetEntryService {
	constructor(
		@inject(TYPES.ITimesheetEntryRepository)
		private timesheetEntryRepository: ITimesheetEntryRepository,
		@inject(TYPES.IProjectRepository)
		private projectRepository: IProjectRepository,
		@inject(TYPES.IProjectResourceAssignmentRepository)
		private projectResourceAssignmentRepository: IProjectResourceAssignmentRepository,
		@inject(TYPES.ITimesheetPeriodRepository)
		private timesheetPeriodRepository: ITimesheetPeriodRepository
	) {}

	/** Associations are only guaranteed present when the query that produced
	 * `entry` requested them via `include` (both list/detail queries below
	 * always do) — guarded rather than asserted so a future call site that
	 * forgets the `include` fails loudly instead of serializing `undefined`
	 * (same convention as `ProjectResourceAssignmentService.toListItemDTO`). */
	private toDetailDTO(entry: TimesheetEntry): TimesheetEntryDetailDTO {
		const { user, project, timesheetPeriod } = entry
		if (!user || !project || !timesheetPeriod) {
			throw new AppException('Failed to load timesheet entry details', 500)
		}

		return {
			id: entry.id,
			user: { id: user.id, fullName: user.name },
			project: { id: project.id, code: project.code, name: project.name },
			timesheetPeriod: {
				id: timesheetPeriod.id,
				startDate: timesheetPeriod.startDate,
				endDate: timesheetPeriod.endDate,
			},
			entryDate: entry.entryDate,
			hours: Number(entry.hours),
			taskDescription: entry.description,
			isApproved: entry.isApproved,
			approvedBy: entry.approvedBy ?? null,
			approvedAt: entry.approvedAt ?? null,
			createdAt: entry.createdAt,
			updatedAt: entry.updatedAt,
		}
	}

	private toListItemDTO(entry: TimesheetEntry): TimesheetEntryListItemDTO {
		const { user, project } = entry
		if (!user || !project) {
			throw new AppException('Failed to load timesheet entry details', 500)
		}

		return {
			id: entry.id,
			user: { id: user.id, fullName: user.name },
			project: { id: project.id, code: project.code, name: project.name },
			entryDate: entry.entryDate,
			hours: Number(entry.hours),
			taskDescription: entry.description,
			isApproved: entry.isApproved,
			createdAt: entry.createdAt,
		}
	}

	/**
	 * Buckets daily totals into Monday–Sunday (ISO) weeks. The API spec's
	 * `weeklySummaries` example doesn't line up with a fixed weekday
	 * convention, so this picks the standard ISO week explicitly rather than
	 * guessing a bespoke rolling window — flagged as an assumption.
	 */
	private buildWeeklySummaries(
		dailySummaries: DailySummaryDTO[]
	): WeeklySummaryDTO[] {
		const totalsByWeekStart = new Map<string, number>()

		for (const { date, totalHours } of dailySummaries) {
			const weekStart = this.getIsoWeekStart(date)
			totalsByWeekStart.set(
				weekStart,
				(totalsByWeekStart.get(weekStart) ?? 0) + totalHours
			)
		}

		return Array.from(totalsByWeekStart.entries())
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([weekStart, totalHours]) => ({
				weekStart,
				weekEnd: this.addDays(weekStart, 6),
				totalHours,
			}))
	}

	private getIsoWeekStart(dateOnly: string): string {
		const date = new Date(`${dateOnly}T00:00:00.000Z`)
		const dayOfWeek = date.getUTCDay() // 0 = Sunday ... 6 = Saturday
		const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
		date.setUTCDate(date.getUTCDate() - daysSinceMonday)
		return date.toISOString().slice(0, 10)
	}

	private addDays(dateOnly: string, days: number): string {
		const date = new Date(`${dateOnly}T00:00:00.000Z`)
		date.setUTCDate(date.getUTCDate() + days)
		return date.toISOString().slice(0, 10)
	}

	public async getAllTimesheetEntries(
		options: TimesheetEntryFilterOptions,
		currentUserId: number,
		canManageAll: boolean
	): Promise<TimesheetEntryListResultDTO> {
		const {
			projectId,
			startDate,
			endDate,
			timesheetPeriodId,
			isApproved,
			page,
			perPage,
		} = options

		// Non-admins are always scoped to their own entries, regardless of
		// what `userId` they pass — the `userId` filter is admin-only per the
		// API spec.
		const userId = canManageAll ? options.userId : currentUserId

		const whereClause: WhereOptions = {
			...(userId !== undefined && { userId }),
			...(projectId !== undefined && { projectId }),
			...(timesheetPeriodId !== undefined && { timesheetPeriodId }),
			...(isApproved !== undefined && { isApproved }),
			...(startDate &&
				endDate && { entryDate: { [Op.between]: [startDate, endDate] } }),
			...(startDate && !endDate && { entryDate: { [Op.gte]: startDate } }),
			...(!startDate && endDate && { entryDate: { [Op.lte]: endDate } }),
		}

		const paginated = await this.timesheetEntryRepository.findAndPaginate(
			page,
			perPage,
			{
				where: whereClause,
				include: ENTRY_INCLUDE.filter((i) => i.as !== 'timesheetPeriod'),
				order: [
					['entryDate', 'DESC'],
					['id', 'DESC'],
				],
			}
		)

		const dailyTotals =
			await this.timesheetEntryRepository.sumHoursGroupedByDate(whereClause)
		const dailySummaries: DailySummaryDTO[] = dailyTotals.map((row) => ({
			date: row.entryDate,
			totalHours: Number(row.totalHours),
		}))

		return {
			items: paginated.data.map((entry) => this.toListItemDTO(entry)),
			totalCount: paginated.totalResults ?? 0,
			dailySummaries,
			weeklySummaries: this.buildWeeklySummaries(dailySummaries),
			page,
			pageSize: perPage,
		}
	}

	public async getTimesheetEntryById(
		id: number,
		currentUserId: number,
		canManageAll: boolean
	): Promise<TimesheetEntryDetailDTO> {
		const entry = await this.timesheetEntryRepository.findByPk(id, {
			include: ENTRY_INCLUDE,
		})

		if (!entry) {
			throw new AppException('Timesheet entry not found', 404)
		}

		if (!canManageAll && entry.userId !== currentUserId) {
			throw new AppException(
				"Forbidden: cannot access another user's timesheet entry",
				403
			)
		}

		return this.toDetailDTO(entry)
	}

	public async createTimesheetEntry(
		entryData: CreateTimesheetEntryDTO,
		currentUserId: number
	): Promise<TimesheetEntryCreateResponseDTO> {
		const { projectId, entryDate, hours, taskDescription } = entryData

		const project = await this.projectRepository.findByPk(projectId)
		if (!project) {
			throw new AppException('Project not found', 404)
		}
		if (!project.isActive) {
			throw new AppException('Project is not active', 400)
		}

		const assignment =
			await this.projectResourceAssignmentRepository.findActiveByProjectAndUser(
				projectId,
				currentUserId
			)
		if (!assignment) {
			throw new AppException(
				'You are not assigned to this project',
				403
			)
		}

		const period = await this.timesheetPeriodRepository.findByDate(entryDate)
		if (!period) {
			throw new AppException(
				'No timesheet period is defined for this date',
				400
			)
		}
		if (period.isLocked) {
			throw new AppException(
				'Cannot log time against a locked timesheet period',
				400
			)
		}

		const maxDailyHours = Number(project.maxDailyHours)
		if (hours > maxDailyHours) {
			throw new AppException(
				`hours cannot exceed the project's max daily hours (${maxDailyHours})`,
				400
			)
		}

		// Application-level pre-check for the common case; the DB's generated
		// -column unique index (`timesheet_entries_active_user_project_date_uidx`)
		// is the authoritative backstop against a concurrent request racing
		// this check (same trade-off as `TimesheetPeriodService.createTimesheetPeriod`'s
		// `findOverlapping` pre-check).
		const duplicate = await this.timesheetEntryRepository.findByUserProjectAndDate(
			currentUserId,
			projectId,
			entryDate
		)
		if (duplicate) {
			throw new AppException(
				'A timesheet entry already exists for this project and date',
				409
			)
		}

		const entry = await sequelize.transaction(async (transaction) => {
			return this.timesheetEntryRepository.create(
				{
					userId: currentUserId,
					projectId,
					timesheetPeriodId: period.id,
					entryDate,
					hours: hours.toFixed(2),
					description: taskDescription,
				},
				{ transaction }
			)
		})

		if (!entry) {
			throw new AppException('Failed to create timesheet entry', 500)
		}

		return {
			id: entry.id,
			projectId: project.id,
			projectName: project.name,
			entryDate: entry.entryDate,
			hours: Number(entry.hours),
			taskDescription: entry.description,
			isApproved: entry.isApproved,
			timesheetPeriod: {
				id: period.id,
				startDate: period.startDate,
				endDate: period.endDate,
			},
		}
	}

	public async updateTimesheetEntry(
		id: number,
		entryData: UpdateTimesheetEntryDTO,
		currentUserId: number
	): Promise<TimesheetEntryDetailDTO> {
		const entry = await this.timesheetEntryRepository.findByPk(id, {
			include: ENTRY_INCLUDE,
		})
		if (!entry) {
			throw new AppException('Timesheet entry not found', 404)
		}

		// Per the API spec, `UpdateTimesheetEntry` is owner-only with no
		// admin override (unlike `DeleteTimesheetEntry`, which also allows
		// `SystemAdmin`) — see the spec's Auth column for this endpoint.
		if (entry.userId !== currentUserId) {
			throw new AppException(
				"Forbidden: cannot update another user's timesheet entry",
				403
			)
		}

		if (entry.timesheetPeriod?.isLocked) {
			throw new AppException(
				'Cannot update an entry in a locked timesheet period',
				400
			)
		}
		if (entry.isApproved) {
			throw new AppException(
				'Cannot update an already-approved timesheet entry',
				400
			)
		}

		if (entryData.hours !== undefined) {
			const maxDailyHours = Number(entry.project?.maxDailyHours ?? 0)
			if (entryData.hours > maxDailyHours) {
				throw new AppException(
					`hours cannot exceed the project's max daily hours (${maxDailyHours})`,
					400
				)
			}
		}

		const updated = await sequelize.transaction(async (transaction) => {
			return entry.update(
				{
					...(entryData.hours !== undefined && {
						hours: entryData.hours.toFixed(2),
					}),
					...(entryData.taskDescription !== undefined && {
						description: entryData.taskDescription,
					}),
				},
				{ transaction }
			)
		})

		return this.toDetailDTO(updated)
	}

	public async deleteTimesheetEntry(
		id: number,
		currentUserId: number,
		canManageAll: boolean
	): Promise<boolean> {
		const entry = await this.timesheetEntryRepository.findByPk(id, {
			include: [
				{ model: TimesheetPeriod, as: 'timesheetPeriod', attributes: ['isLocked'] },
			],
		})
		if (!entry) {
			return false
		}

		if (!canManageAll && entry.userId !== currentUserId) {
			throw new AppException(
				"Forbidden: cannot delete another user's timesheet entry",
				403
			)
		}

		if (entry.timesheetPeriod?.isLocked) {
			throw new AppException(
				'Cannot delete an entry in a locked timesheet period',
				400
			)
		}
		if (entry.isApproved) {
			throw new AppException(
				'Cannot delete an already-approved timesheet entry',
				400
			)
		}

		return await sequelize.transaction(async (transaction) => {
			const deletedCount = await this.timesheetEntryRepository.delete({
				where: { id },
				transaction,
			})
			return deletedCount > 0
		})
	}

	public async approveTimesheetEntry(
		id: number,
		approvedByUserId: number
	): Promise<ApproveTimesheetEntryResponseDTO> {
		const entry = await this.timesheetEntryRepository.findByPk(id)
		if (!entry) {
			throw new AppException('Timesheet entry not found', 404)
		}
		if (entry.isApproved) {
			throw new AppException('Timesheet entry is already approved', 409)
		}

		const updated = await sequelize.transaction(async (transaction) => {
			return entry.update(
				{
					isApproved: true,
					approvedBy: approvedByUserId,
					approvedAt: new Date(),
				},
				{ transaction }
			)
		})

		return {
			id: updated.id,
			isApproved: updated.isApproved,
			approvedAt: updated.approvedAt ?? null,
			approvedBy: updated.approvedBy ?? null,
		}
	}

	public async unapproveTimesheetEntry(id: number): Promise<void> {
		const entry = await this.timesheetEntryRepository.findByPk(id)
		if (!entry) {
			throw new AppException('Timesheet entry not found', 404)
		}
		if (!entry.isApproved) {
			throw new AppException('Timesheet entry is not approved', 409)
		}

		// Note: `InvoiceLineItem`/`Invoice` (Module 6) do not exist yet in
		// this codebase, so the API spec's `409 entry already included in an
		// invoice` guard can't be checked here — add it once that
		// association exists.
		await sequelize.transaction(async (transaction) => {
			await entry.update(
				{ isApproved: false, approvedBy: null, approvedAt: null },
				{ transaction }
			)
		})
	}

	public async bulkApproveTimesheetEntries(
		entryIds: number[],
		approvedByUserId: number
	): Promise<BulkApproveResultDTO> {
		if (entryIds.length === 0) {
			return { approvedCount: 0, skippedCount: 0 }
		}

		return await sequelize.transaction(async (transaction) => {
			const [affectedCount] = await this.timesheetEntryRepository.update(
				{
					isApproved: true,
					approvedBy: approvedByUserId,
					approvedAt: new Date(),
				},
				{
					where: { id: { [Op.in]: entryIds }, isApproved: false },
					returning: true,
					transaction,
				}
			)

			return {
				approvedCount: affectedCount,
				skippedCount: entryIds.length - affectedCount,
			}
		})
	}
}
