import { injectable, inject } from 'inversify'
import { FindAndCountOptions, FindOptions, Op, WhereOptions } from 'sequelize'
import { IResourceRoleTypeService } from '../interfaces/service/IResourceRoleTypeService'
import { IResourceRoleTypeRepository } from '../interfaces/repository/IResourceRoleTypeRepository'
import { ResourceRoleType } from '../models/ResourceRoleType'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	CreateResourceRoleTypeDTO,
	ResourceRoleTypeFilterOptions,
	UpdateResourceRoleTypeDTO,
} from '../types/resourceRoleTypeTypes'

@injectable()
export class ResourceRoleTypeService implements IResourceRoleTypeService {
	constructor(
		@inject(TYPES.IResourceRoleTypeRepository)
		private resourceRoleTypeRepository: IResourceRoleTypeRepository
	) {}

	public async getAllResourceRoleTypes(options: ResourceRoleTypeFilterOptions) {
		const { page, perPage, keyword } = options

		const whereClause: WhereOptions = {
			...(keyword && {
				[Op.or]: ResourceRoleType.searchableFields.map((field) => ({
					// MySQL's default collation is case-insensitive, so a plain
					// `LIKE` behaves the way an `ILIKE` would on Postgres — see
					// the identical note in `ProjectService.getAllProjects`.
					[field]: { [Op.like]: `%${keyword}%` },
				})),
			}),
		}

		const queryOptions: FindAndCountOptions | FindOptions = {
			where: whereClause,
			attributes: ['id', 'name', 'description'],
			order: [['name', 'ASC']],
		}

		if (perPage) {
			return this.resourceRoleTypeRepository.findAndPaginate(
				page,
				perPage,
				queryOptions as FindAndCountOptions
			)
		}

		return this.resourceRoleTypeRepository.find(queryOptions as FindOptions)
	}

	public async createResourceRoleType(
		resourceRoleTypeData: CreateResourceRoleTypeDTO
	): Promise<ResourceRoleType> {
		const name = resourceRoleTypeData.name.trim()

		const existingResourceRoleType =
			await this.resourceRoleTypeRepository.findByName(name)
		if (existingResourceRoleType) {
			throw new AppException(
				'Resource role type with this name already exists',
				409
			)
		}

		const resourceRoleType = await this.resourceRoleTypeRepository.create({
			...resourceRoleTypeData,
			name,
		})

		if (!resourceRoleType) {
			throw new AppException('Failed to create resource role type', 500)
		}

		return resourceRoleType
	}

	public async getResourceRoleTypeById(id: number): Promise<ResourceRoleType> {
		const resourceRoleType = await this.resourceRoleTypeRepository.findByPk(
			id,
			{ attributes: ['id', 'name', 'description'] }
		)

		if (!resourceRoleType) {
			throw new AppException('Resource role type not found', 404)
		}

		return resourceRoleType
	}

	public async updateResourceRoleType(
		id: number,
		resourceRoleTypeData: UpdateResourceRoleTypeDTO
	): Promise<ResourceRoleType | null> {
		const resourceRoleType = await this.resourceRoleTypeRepository.findByPk(id)
		if (!resourceRoleType) {
			return null
		}

		const updateData: UpdateResourceRoleTypeDTO = { ...resourceRoleTypeData }

		if (updateData.name) {
			const name = updateData.name.trim()
			const existingResourceRoleType =
				await this.resourceRoleTypeRepository.findByName(name)
			if (existingResourceRoleType && existingResourceRoleType.id !== id) {
				throw new AppException(
					'Resource role type with this name already exists',
					409
				)
			}
			updateData.name = name
		}

		// Note: this project's DB dialect is MySQL, which does not support
		// `RETURNING`. Updating the already-fetched instance directly avoids
		// relying on it — see the identical note in `CountryService.updateCountry`.
		return await sequelize.transaction(async (transaction) => {
			return resourceRoleType.update(updateData, { transaction })
		})
	}

	public async deleteResourceRoleType(id: number): Promise<boolean> {
		const resourceRoleType = await this.resourceRoleTypeRepository.findByPk(id)
		if (!resourceRoleType) {
			return false
		}

		// Note: `resource_role_types` currently has no incoming foreign keys
		// (no ProjectAssignment/RateCard/InvoiceLineItem model or association
		// exists yet in this codebase), so there is no "referenced by" guard
		// here. Revisit this once those associations are introduced, per the
		// API spec's deletion rule ("fails if referenced by assignments, rate
		// cards, or invoice line items") — same caveat as
		// `CountryService.deleteCountry` / `ProjectService.deleteProject`.
		const deletedCount = await this.resourceRoleTypeRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}
}
