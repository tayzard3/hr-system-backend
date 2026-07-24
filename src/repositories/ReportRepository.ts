import { injectable } from 'inversify'
import { Attributes, WhereOptions, fn, col } from 'sequelize'
import { TimesheetEntry } from '../models/TimesheetEntry'
import {
	IReportRepository,
	UserProjectHoursTotal,
} from '../interfaces/repository/IReportRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class ReportRepository
	extends BaseRepository<TimesheetEntry>
	implements IReportRepository
{
	constructor() {
		super(TimesheetEntry)
	}

	public async sumHours(
		where: WhereOptions<Attributes<TimesheetEntry>>
	): Promise<string> {
		const row = await this.model.findOne({
			where,
			attributes: [[fn('SUM', col('hours')), 'totalHours']],
			raw: true,
		})

		// `raw: true` + an aggregate `fn(...)` column means Sequelize returns a
		// plain object keyed by the attribute above rather than a model
		// instance (same convention as `TimesheetEntryRepository.sumHoursGroupedByDate`).
		// `SUM` over zero rows comes back as `null`, not `0`.
		const totalHours = (row as unknown as { totalHours: string | null } | null)
			?.totalHours
		return totalHours ?? '0'
	}

	public async sumHoursGroupedByUserAndProject(
		where: WhereOptions<Attributes<TimesheetEntry>>
	): Promise<UserProjectHoursTotal[]> {
		const rows = await this.model.findAll({
			where,
			attributes: ['userId', 'projectId', [fn('SUM', col('hours')), 'totalHours']],
			group: ['userId', 'projectId'],
			raw: true,
		})

		return rows as unknown as UserProjectHoursTotal[]
	}
}
