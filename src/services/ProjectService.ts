import { injectable, inject } from 'inversify'
import { FindAndCountOptions, FindOptions, Op, WhereOptions } from 'sequelize'
import { IProjectService } from '../interfaces/service/IProjectService'
import { IProjectRepository } from '../interfaces/repository/IProjectRepository'
import { Project } from '../models/Project'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	CreateProjectDTO,
	ProjectFilterOptions,
	ProjectResponseDTO,
	UpdateProjectDTO,
} from '../types/projectTypes'
import { PaginationResult } from '../utils/Paginator'

@injectable()
export class ProjectService implements IProjectService {
	constructor(
		@inject(TYPES.IProjectRepository)
		private projectRepository: IProjectRepository
	) {}

	/**
	 * Sequelize returns the `DECIMAL(4,2)` `max_daily_hours` column as a
	 * string (see the comment on `Project.maxDailyHours`). Map the raw model
	 * to the API-facing DTO here so every response gets a real `number`,
	 * matching the API spec's `"maxDailyHours": 8.0` example.
	 */
	private toResponseDTO(project: Project): ProjectResponseDTO {
		const plain = project.get({ plain: true })
		return {
			id: plain.id,
			code: plain.code,
			name: plain.name,
			description: plain.description ?? null,
			clientName: plain.clientName ?? null,
			clientEmail: plain.clientEmail ?? null,
			startDate: plain.startDate,
			endDate: plain.endDate ?? null,
			maxDailyHours: Number(plain.maxDailyHours),
			isActive: plain.isActive,
			createdAt: plain.createdAt,
			updatedAt: plain.updatedAt,
		}
	}

	/** Business rule shared by create/update: when both dates are known, the
	 * project cannot end before it starts. */
	private assertValidDateRange(
		startDate: string,
		endDate: string | null | undefined
	): void {
		if (endDate && endDate < startDate) {
			throw new AppException('endDate cannot be before startDate', 400)
		}
	}

	public async getAllProjects(
		options: ProjectFilterOptions
	): Promise<PaginationResult<ProjectResponseDTO> | ProjectResponseDTO[]> {
		const { page, perPage, keyword, isActive, clientName } = options

		const whereClause: WhereOptions = {
			...(keyword && {
				[Op.or]: Project.searchableFields.map((field) => ({
					// MySQL's default collation is case-insensitive, so a plain
					// `LIKE` behaves the way an `ILIKE` would on Postgres —
					// unlike `Op.iLike`, which MySQL does not support at all.
					[field]: { [Op.like]: `%${keyword}%` },
				})),
			}),
			...(isActive !== undefined && { isActive }),
			...(clientName && { clientName }),
		}

		const queryOptions: FindAndCountOptions | FindOptions = {
			where: whereClause,
			order: [['id', 'ASC']],
		}

		if (perPage) {
			const paginated = await this.projectRepository.findAndPaginate(
				page,
				perPage,
				queryOptions as FindAndCountOptions
			)
			return {
				...paginated,
				data: paginated.data.map((project) => this.toResponseDTO(project)),
			}
		}

		const projects = await this.projectRepository.find(
			queryOptions as FindOptions
		)
		return projects.map((project) => this.toResponseDTO(project))
	}

	public async createProject(
		projectData: CreateProjectDTO
	): Promise<ProjectResponseDTO> {
		const code = projectData.code.trim()

		const existingProject = await this.projectRepository.findByCode(code)
		if (existingProject) {
			throw new AppException('Project with this code already exists', 409)
		}

		this.assertValidDateRange(projectData.startDate, projectData.endDate)

		const project = await sequelize.transaction(async (transaction) => {
			return this.projectRepository.create(
				{
					...projectData,
					code,
					maxDailyHours: projectData.maxDailyHours?.toFixed(2),
				},
				{ transaction }
			)
		})

		if (!project) {
			throw new AppException('Failed to create project', 500)
		}

		return this.toResponseDTO(project)
	}

	public async getProjectById(id: number): Promise<ProjectResponseDTO> {
		const project = await this.projectRepository.findByPk(id)

		if (!project) {
			throw new AppException('Project not found', 404)
		}

		return this.toResponseDTO(project)
	}

	public async updateProject(
		id: number,
		projectData: UpdateProjectDTO
	): Promise<ProjectResponseDTO | null> {
		const project = await this.projectRepository.findByPk(id)
		if (!project) {
			return null
		}

		const updateData: Omit<UpdateProjectDTO, 'maxDailyHours'> & {
			maxDailyHours?: string
		} = {
			...projectData,
			maxDailyHours: projectData.maxDailyHours?.toFixed(2),
		}

		if (updateData.code) {
			const code = updateData.code.trim()
			const existingProject = await this.projectRepository.findByCode(code)
			if (existingProject && existingProject.id !== id) {
				throw new AppException(
					'Project with this code already exists',
					409
				)
			}
			updateData.code = code
		}

		this.assertValidDateRange(
			projectData.startDate ?? project.startDate,
			projectData.endDate !== undefined
				? projectData.endDate
				: project.endDate
		)

		// Note: this project's DB dialect is MySQL, which does not support
		// `RETURNING` — see the identical note in `CountryService.updateCountry`.
		// Updating the already-fetched instance directly avoids relying on it.
		return await sequelize.transaction(async (transaction) => {
			const updated = await project.update(updateData, { transaction })
			return this.toResponseDTO(updated)
		})
	}

	public async deleteProject(id: number): Promise<boolean> {
		const project = await this.projectRepository.findByPk(id)
		if (!project) {
			return false
		}

		// Note: `projects` has no incoming foreign keys yet in this codebase
		// (no TimesheetEntry model/association exists). The API spec's `409
		// project has existing timesheet entries` guard belongs here once
		// that association is introduced.
		return await sequelize.transaction(async (transaction) => {
			await project.update({ isActive: false }, { transaction })
			const deletedCount = await this.projectRepository.delete({
				where: { id },
				transaction,
			})
			return deletedCount > 0
		})
	}
}
