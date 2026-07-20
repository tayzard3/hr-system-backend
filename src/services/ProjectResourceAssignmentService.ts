import { injectable, inject } from 'inversify'
import { WhereOptions } from 'sequelize'
import { IProjectResourceAssignmentService } from '../interfaces/service/IProjectResourceAssignmentService'
import { IProjectResourceAssignmentRepository } from '../interfaces/repository/IProjectResourceAssignmentRepository'
import { IProjectRepository } from '../interfaces/repository/IProjectRepository'
import { IUserRepository } from '../interfaces/repository/IUserRepository'
import { IResourceRoleTypeRepository } from '../interfaces/repository/IResourceRoleTypeRepository'
import { ProjectResourceAssignment } from '../models/ProjectResourceAssignment'
import { User } from '../models/User'
import { ResourceRoleType } from '../models/ResourceRoleType'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	AssignResourceDTO,
	ProjectAssignmentFilterOptions,
	ProjectAssignmentListItemDTO,
	ProjectAssignmentResponseDTO,
} from '../types/projectResourceAssignmentTypes'

@injectable()
export class ProjectResourceAssignmentService
	implements IProjectResourceAssignmentService
{
	constructor(
		@inject(TYPES.IProjectResourceAssignmentRepository)
		private projectResourceAssignmentRepository: IProjectResourceAssignmentRepository,
		@inject(TYPES.IProjectRepository)
		private projectRepository: IProjectRepository,
		@inject(TYPES.IUserRepository)
		private userRepository: IUserRepository,
		@inject(TYPES.IResourceRoleTypeRepository)
		private resourceRoleTypeRepository: IResourceRoleTypeRepository
	) {}

	private toResponseDTO(
		assignment: ProjectResourceAssignment
	): ProjectAssignmentResponseDTO {
		return {
			id: assignment.id,
			projectId: assignment.projectId,
			userId: assignment.userId,
			resourceRoleTypeId: assignment.resourceRoleTypeId,
			assignedAt: assignment.assignedAt,
			isActive: assignment.isActive,
		}
	}

	/**
	 * `user`/`resourceRoleType` are only populated when the query that
	 * produced `assignment` requested them via `include` (as
	 * `getProjectAssignments` does below). Guard rather than assert, so a
	 * future call site that forgets the `include` fails loudly instead of
	 * serializing `undefined`.
	 */
	private toListItemDTO(
		assignment: ProjectResourceAssignment
	): ProjectAssignmentListItemDTO {
		const { user, resourceRoleType } = assignment
		if (!user || !resourceRoleType) {
			throw new AppException(
				'Failed to load assignment details',
				500
			)
		}

		return {
			id: assignment.id,
			user: {
				id: user.id,
				fullName: user.name,
				email: user.email,
			},
			resourceRoleType: {
				id: resourceRoleType.id,
				name: resourceRoleType.name,
			},
			assignedAt: assignment.assignedAt,
			isActive: assignment.isActive,
		}
	}

	public async getProjectAssignments(
		projectId: number,
		options: ProjectAssignmentFilterOptions
	): Promise<ProjectAssignmentListItemDTO[]> {
		const project = await this.projectRepository.findByPk(projectId)
		if (!project) {
			throw new AppException('Project not found', 404)
		}

		const whereClause: WhereOptions = {
			projectId,
			...(options.isActive !== undefined && { isActive: options.isActive }),
		}

		const assignments = await this.projectResourceAssignmentRepository.find({
			where: whereClause,
			include: [
				{ model: User, as: 'user', attributes: ['id', 'name', 'email'] },
				{
					model: ResourceRoleType,
					as: 'resourceRoleType',
					attributes: ['id', 'name'],
				},
			],
			order: [['assignedAt', 'DESC']],
		})

		return assignments.map((assignment) => this.toListItemDTO(assignment))
	}

	public async assignResource(
		projectId: number,
		data: AssignResourceDTO
	): Promise<ProjectAssignmentResponseDTO> {
		const project = await this.projectRepository.findByPk(projectId)
		if (!project) {
			throw new AppException('Project not found', 404)
		}

		const user = await this.userRepository.findByPk(data.userId)
		if (!user) {
			throw new AppException('User not found', 404)
		}

		const resourceRoleType = await this.resourceRoleTypeRepository.findByPk(
			data.resourceRoleTypeId
		)
		if (!resourceRoleType) {
			throw new AppException('Resource role type not found', 404)
		}

		// Application-level pre-check for the common case; the DB's
		// generated-column unique index
		// (`project_resource_assignments_active_user_project_uidx`) is the
		// authoritative backstop against a concurrent request racing this
		// check (same trade-off as `ProjectService.createProject`'s
		// `findByCode` pre-check for duplicate project codes).
		const existingActiveAssignment =
			await this.projectResourceAssignmentRepository.findActiveByProjectAndUser(
				projectId,
				data.userId
			)
		if (existingActiveAssignment) {
			throw new AppException(
				'User is already assigned to this project',
				409
			)
		}

		const assignment = await sequelize.transaction(async (transaction) => {
			return this.projectResourceAssignmentRepository.create(
				{
					projectId,
					userId: data.userId,
					resourceRoleTypeId: data.resourceRoleTypeId,
				},
				{ transaction }
			)
		})

		if (!assignment) {
			throw new AppException('Failed to assign resource to project', 500)
		}

		return this.toResponseDTO(assignment)
	}

	public async removeResource(
		projectId: number,
		assignmentId: number
	): Promise<boolean> {
		const project = await this.projectRepository.findByPk(projectId)
		if (!project) {
			throw new AppException('Project not found', 404)
		}

		const assignment = await this.projectResourceAssignmentRepository.findOne(
			{ where: { id: assignmentId, projectId } }
		)
		if (!assignment) {
			return false
		}

		// Per the DB agent's schema notes, `RemoveResource` flips `is_active`
		// to false rather than using the model's paranoid soft-delete
		// (`deleted_at` is framework-level only) — this keeps the row (and its
		// history) queryable via `GetProjectAssignments?isActive=false` while
		// freeing up the (project, user) pair for a future re-assignment.
		await sequelize.transaction(async (transaction) => {
			await assignment.update({ isActive: false }, { transaction })
		})

		return true
	}
}
