import { Attributes, WhereOptions } from 'sequelize'
import { TimesheetEntry } from '../../models/TimesheetEntry'
import { IBaseRepository } from './IBaseRepository'

/** Raw `SUM(hours)` grouped by `(userId, projectId)` — the granularity at
 * which a resource's role (via `ProjectResourceAssignment`) is resolved. */
export interface UserProjectHoursTotal {
	userId: number
	projectId: number
	totalHours: string
}

export interface IReportRepository extends IBaseRepository<TimesheetEntry> {
	/**
	 * `SUM(hours)` over the *entire* filtered result set (not just the
	 * current page) — backs `GenerateTimesheetReport`'s `totalHours`.
	 */
	sumHours(where: WhereOptions<Attributes<TimesheetEntry>>): Promise<string>

	/**
	 * `SUM(hours)` grouped by `(userId, projectId)` for the given filter —
	 * backs `GenerateUserRolesSummary` (RP-03) and
	 * `GenerateMonthlyCostRevenue` (RP-04), both of which need to bucket
	 * hours by resource role type / country, and role/country are only
	 * resolvable per `(userId, projectId)` pair (via the active
	 * `ProjectResourceAssignment`), not per individual entry.
	 */
	sumHoursGroupedByUserAndProject(
		where: WhereOptions<Attributes<TimesheetEntry>>
	): Promise<UserProjectHoursTotal[]>
}
