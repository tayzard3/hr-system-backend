import { injectable, inject } from 'inversify'
import { IRoleService } from '../interfaces/service/IRoleService'
import { IRoleRepository } from '../interfaces/repository/IRoleRepository'
import { Role } from '../models/Role'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import { FindAndCountOptions, FindOptions, Op, WhereOptions } from 'sequelize'
import {
	CreateRoleDTO,
	RoleFilterOptions,
	UpdateRoleDTO,
} from '../types/roleTypes'
import { Permission, sequelize } from '../models'
import { DEFAULT_ROLE } from '../constants'

@injectable()
export class RoleService implements IRoleService {
	constructor(
		@inject(TYPES.IRoleRepository) private roleRepository: IRoleRepository
	) {}

	public async getAllRoles(options: RoleFilterOptions) {
		const { page = 1, perPage, keyword, isDeveloper } = options

		const whereClause: WhereOptions = {
			...(keyword && {
				[Op.or]: Role.searchableFields.map((field) => ({
					[field]: { [Op.iLike]: `%${keyword}%` },
				})),
			}),
			...(!isDeveloper && { name: { [Op.ne]: DEFAULT_ROLE.DEVELOPER } }),
		}

		const queryOptions: FindAndCountOptions | FindOptions = {
			where: whereClause,
			attributes: ['id', 'name', 'description'],
			order: [['id', 'ASC']],
		}

		if (perPage) {
			return this.roleRepository.findAndPaginate(
				page,
				perPage,
				queryOptions as FindAndCountOptions
			)
		}

		return this.roleRepository.find(queryOptions as FindOptions)
	}

	public async createRole(roleData: CreateRoleDTO): Promise<Role> {
		const { name, permissions } = roleData
		const existingRole = await this.roleRepository.findOne({
			where: { name: name },
		})
		if (existingRole) {
			throw new AppException('Role with this name already exists', 409)
		}
		const role = await sequelize.transaction(async (transaction) => {
			const role = await this.roleRepository.create(roleData, {
				transaction,
			})
			if (!role) {
				throw new AppException('Failed to create role', 500)
			}

			if (permissions && permissions.length > 0) {
				await role.addPermissions(permissions, { transaction })
			}
			return role
		})

		return role
	}

	public async getRoleById(id: number) {
		const role = await this.roleRepository.findByPk(id, {
			attributes: ['id', 'name', 'description'],
			include: [
				{
					model: Permission,
					as: 'permissions',
					attributes: ['id', 'name', 'description'],
					through: {
						attributes: [],
					},
				},
			],
		})

		if (!role) {
			throw new AppException('Role not found', 404)
		}

		return role
	}

	public async updateRole(
		id: number,
		roleData: UpdateRoleDTO
	): Promise<Role | null> {
		const { name, permissions } = roleData
		const role = await this.roleRepository.findByPk(id)
		if (!role) {
			return null
		}
		if (name) {
			const existingRole = await this.roleRepository.findOne({
				where: { name: name },
			})
			if (existingRole && existingRole.id !== id) {
				throw new AppException(
					'Role with this name already exists',
					409
				)
			}
		}
		return await sequelize.transaction(async (transaction) => {
			await role.setPermissions(permissions, { transaction })

			const [, updatedRoles] = await this.roleRepository.update(
				roleData,
				{
					where: { id },
					returning: true,
					transaction,
				}
			)
			return updatedRoles[0] || null
		})
	}

	public async deleteRole(id: number): Promise<boolean> {
		const role = await this.roleRepository.findByPk(id)
		if (!role) {
			return false
		}

		if (role.name === DEFAULT_ROLE.DEVELOPER) {
			throw new AppException("You can't delete defaule role!", 422)
		}

		const deletedCount = await this.roleRepository.delete({ where: { id } })
		return deletedCount > 0
	}
}
