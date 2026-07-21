import { injectable } from 'inversify'
import { Attributes, WhereOptions, fn, col } from 'sequelize'
import { TimesheetEntry } from '../models/TimesheetEntry'
import {
	DailyHoursTotal,
	ITimesheetEntryRepository,
} from '../interfaces/repository/ITimesheetEntryRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class TimesheetEntryRepository
	extends BaseRepository<TimesheetEntry>
	implements ITimesheetEntryRepository
{
	constructor() {
		super(TimesheetEntry)
	}

	public async findByUserProjectAndDate(
		userId: number,
		projectId: number,
		entryDate: string
	): Promise<TimesheetEntry | null> {
		return this.model.findOne({ where: { userId, projectId, entryDate } })
	}

	public async sumHoursGroupedByDate(
		where: WhereOptions<Attributes<TimesheetEntry>>
	): Promise<DailyHoursTotal[]> {
		const rows = await this.model.findAll({
			where,
			attributes: [
				'entryDate',
				[fn('SUM', col('hours')), 'totalHours'],
			],
			group: ['entryDate'],
			order: [['entryDate', 'ASC']],
			raw: true,
		})

		// `raw: true` + an aggregate `fn(...)` column means Sequelize returns
		// plain objects keyed by the attributes above rather than model
		// instances, so this cast reflects the actual runtime shape.
		return rows as unknown as DailyHoursTotal[]
	}
}
