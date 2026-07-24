import { injectable } from 'inversify'
import { Op } from 'sequelize'
import { ProjectResourceAssignment } from '../models/ProjectResourceAssignment'
import { User } from '../models/User'
import { ResourceRoleType } from '../models/ResourceRoleType'
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

	public async findActiveByProjectIds(
		projectIds: number[]
	): Promise<ProjectResourceAssignment[]> {
		if (projectIds.length === 0) {
			return []
		}

		return this.model.findAll({
			where: { projectId: { [Op.in]: projectIds }, isActive: true },
			include: [
				{ model: User, as: 'user', attributes: ['id', 'countryId'] },
				{ model: ResourceRoleType, as: 'resourceRoleType', attributes: ['id', 'name'] },
			],
		})
	}
}
