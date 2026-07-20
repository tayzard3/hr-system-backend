import { TimesheetPeriod } from '../../models/TimesheetPeriod'
import { IBaseRepository } from './IBaseRepository'

export interface ITimesheetPeriodRepository
	extends IBaseRepository<TimesheetPeriod> {
	/**
	 * Looks up a non-deleted period whose `[startDate, endDate]` range
	 * overlaps the given range — backs the `CreateTimesheetPeriod` `409
	 * overlapping period exists` rule. Backed by
	 * `timesheet_periods_start_date_end_date_idx` (see the migration).
	 * `excludeId` lets a future "update period dates" flow re-run this check
	 * without matching itself; unused by `create` today.
	 */
	findOverlapping(
		startDate: string,
		endDate: string,
		excludeId?: number
	): Promise<TimesheetPeriod | null>
}
