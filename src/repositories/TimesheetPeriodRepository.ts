import { injectable } from 'inversify'
import { Op } from 'sequelize'
import { TimesheetPeriod } from '../models/TimesheetPeriod'
import { ITimesheetPeriodRepository } from '../interfaces/repository/ITimesheetPeriodRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class TimesheetPeriodRepository
	extends BaseRepository<TimesheetPeriod>
	implements ITimesheetPeriodRepository
{
	constructor() {
		super(TimesheetPeriod)
	}

	public async findOverlapping(
		startDate: string,
		endDate: string,
		excludeId?: number
	): Promise<TimesheetPeriod | null> {
		return this.model.findOne({
			where: {
				startDate: { [Op.lte]: endDate },
				endDate: { [Op.gte]: startDate },
				...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }),
			},
		})
	}
}
