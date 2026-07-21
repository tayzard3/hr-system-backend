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

	/**
	 * Looks up the (non-deleted) period whose `[startDate, endDate]` range
	 * contains `date` — backs `TimesheetEntryService`'s auto-resolution of
	 * `timesheetPeriodId` from the request's `entryDate` (TS-03/TS-07).
	 * Periods are expected not to overlap (enforced by `findOverlapping` at
	 * creation time), so at most one row should ever match.
	 */
	findByDate(date: string): Promise<TimesheetPeriod | null>
}
