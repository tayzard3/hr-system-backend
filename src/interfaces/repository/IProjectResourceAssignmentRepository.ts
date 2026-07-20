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
}
