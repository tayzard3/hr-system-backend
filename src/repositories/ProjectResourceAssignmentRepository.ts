import { injectable } from 'inversify'
import { ProjectResourceAssignment } from '../models/ProjectResourceAssignment'
import { IProjectResourceAssignmentRepository } from '../interfaces/repository/IProjectResourceAssignmentRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class ProjectResourceAssignmentRepository
	extends BaseRepository<ProjectResourceAssignment>
	implements IProjectResourceAssignmentRepository
{
	constructor() {
		super(ProjectResourceAssignment)
	}

	public async findActiveByProjectAndUser(
		projectId: number,
		userId: number
	): Promise<ProjectResourceAssignment | null> {
		return this.model.findOne({
			where: { projectId, userId, isActive: true },
		})
	}
}
