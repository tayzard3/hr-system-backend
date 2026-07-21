import { Attributes, WhereOptions } from 'sequelize'
import { TimesheetEntry } from '../../models/TimesheetEntry'
import { IBaseRepository } from './IBaseRepository'

export interface DailyHoursTotal {
	entryDate: string
	totalHours: string
}

export interface ITimesheetEntryRepository
	extends IBaseRepository<TimesheetEntry> {
	/**
	 * Looks up a non-deleted entry for the same `userId + projectId +
	 * entryDate` — backs the "no duplicate entry" rule (TS-07) at the
	 * application layer. `active_entry_marker`'s generated-column unique
	 * index (see the migration) is the authoritative backstop against a
	 * concurrent request racing this check, same trade-off as
	 * `ProjectResourceAssignmentRepository.findActiveByProjectAndUser`.
	 */
	findByUserProjectAndDate(
		userId: number,
		projectId: number,
		entryDate: string
	): Promise<TimesheetEntry | null>

	/**
	 * `SUM(hours)` grouped by `entryDate` for the given filter — backs
	 * `GetAllTimesheetEntries`'s `dailySummaries` (TS-06). Computed over the
	 * *entire* filtered result set (not just the current page), since a
	 * summary scoped to one page of results would be meaningless.
	 */
	sumHoursGroupedByDate(
		where: WhereOptions<Attributes<TimesheetEntry>>
	): Promise<DailyHoursTotal[]>
}
