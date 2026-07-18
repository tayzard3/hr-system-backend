import { injectable, inject } from 'inversify'
import { IPermissionService } from '../interfaces/service/IPermissionService'
import { IPermissionRepository } from '../interfaces/repository/IPermissionRepository'
import { Permission } from '../models/Permission'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import { FindAndCountOptions, FindOptions, Op, WhereOptions } from 'sequelize'
import {
	CreatePermissionDTO,
	PermissionFilterOptions,
	UpdatePermissionDTO,
} from '../types/permissionTypes'
import { Role, sequelize } from '../models'

@injectable()
export class PermissionService implements IPermissionService {
	constructor(
		@inject(TYPES.IPermissionRepository)
		private permissionRepository: IPermissionRepository
	) {}

	public async getAllPermissions(options: PermissionFilterOptions) {
		const { page, perPage, keyword } = options

		const whereClause: WhereOptions = {
			...(keyword && {
				[Op.or]: Permission.searchableFields.map((field) => ({
					[field]: { [Op.iLike]: `%${keyword}%` },
				})),
			}),
		}

		const queryOptions: FindAndCountOptions | FindOptions = {
			where: whereClause,
			attributes: ['id', 'name', 'description'],
			include: [
				{
					model: Role,
					as: 'roles',
					attributes: ['id', 'name'],
					through: {
						attributes: [],
					},
				},
			],
			order: [['id', 'ASC']],
			distinct: true,
		}

		if (perPage) {
			return this.permissionRepository.findAndPaginate(
				page,
				perPage,
				queryOptions as FindAndCountOptions
			)
		}

		return this.permissionRepository.find(queryOptions as FindOptions)
	}

	public async createPermission(
		permissionData: CreatePermissionDTO
	): Promise<Permission> {
		const { name, roles } = permissionData
		const existingPermission = await this.permissionRepository.findOne({
			where: { name: name },
		})
		if (existingPermission) {
			throw new AppException('Permission with this name already exists', 409)
		}

		const permission = await sequelize.transaction(async (transaction) => {
			const permission =
				await this.permissionRepository.create(permissionData)

			if (!permission) {
				throw new AppException('Failed to create permission', 500)
			}

			if (roles && roles.length > 0) {
				await permission.addRoles(roles, { transaction })
			}

			return permission
		})

		return permission
	}

	public async getPermissionById(id: number) {
		const permission = await this.permissionRepository.findByPk(id, {
			attributes: ['id', 'name', 'description'],
			include: [
				{
					model: Role,
					as: 'roles',
					attributes: ['id', 'name'],
					through: {
						attributes: [],
					},
				},
			],
		})

		if (!permission) {
			throw new AppException('Permission not found', 404)
		}

		return permission
	}

	public async updatePermission(
		id: number,
		permissionData: UpdatePermissionDTO
	): Promise<Permission | null> {
		const permission = await this.permissionRepository.findByPk(id)

		if (!permission) {
			return null
		}

		if (permissionData.name) {
			const existingPermission = await this.permissionRepository.findOne({
				where: { name: permissionData.name },
			})
			if (existingPermission && existingPermission.id !== id) {
				throw new AppException(
					'Permission with this name already exists',
					409
				)
			}
		}

		return await sequelize.transaction(async (transaction) => {
			await permission.setRoles(permissionData.roles, { transaction })

			const [, updatedPermissions] = await this.permissionRepository.update(
				permissionData,
				{
					where: { id },
					returning: true,
				}
			)
			return updatedPermissions[0] || null
		})
	}

	public async deletePermission(id: number): Promise<boolean> {
		const permission = await this.permissionRepository.findByPk(id)
		if (!permission) {
			return false
		}
		const deletedCount = await this.permissionRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}
}
