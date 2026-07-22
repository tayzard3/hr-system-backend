import { ProjectResourceAssignment } from '../../models/ProjectResourceAssignment'
import { IBaseRepository } from './IBaseRepository'

export interface IProjectResourceAssignmentRepository
	extends IBaseRepository<ProjectResourceAssignment> {
	/**
	 * Looks up the current active assignment (if any) for a given
	 * project/user pair — used to enforce "one active assignment per user
	 * per project" at the application layer before insert (the DB also
	 * enforces this via `project_resource_assignments_active_user_project_uidx`
	 * as a race-condition backstop).
	 */
	findActiveByProjectAndUser(
		projectId: number,
		userId: number
	): Promise<ProjectResourceAssignment | null>

	/**
	 * All active assignments across the given projects, in a single query —
	 * used by `ReportService` (Module 5) to resolve each `(userId,
	 * projectId)` pair's current resource role type/country in bulk instead
	 * of one lookup per pair (N+1 avoidance for `GenerateUserRolesSummary`/
	 * `GenerateMonthlyCostRevenue`). Returns `[]` for an empty `projectIds`.
	 */
	findActiveByProjectIds(
		projectIds: number[]
	): Promise<ProjectResourceAssignment[]>
}
