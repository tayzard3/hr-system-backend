import { injectable, inject } from 'inversify'
import { IUserService } from '../interfaces/service/IUserService'
import { IUserRepository } from '../interfaces/repository/IUserRepository'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import { Role } from '../models/Role'
import { IPasswordService } from '../interfaces/repository/IPasswordService'
import { sequelize } from '../models'
import { FindAndCountOptions, Op, Transaction, WhereOptions } from 'sequelize'
import {
	CreateUserDTO,
	UpdateUserDTO,
	UserFilterOptions,
} from '../types/userTypes'
import { User } from '../models/User'

@injectable()
class UserService implements IUserService {
	constructor(
		@inject(TYPES.IUserRepository)
		private userRepository: IUserRepository,
		@inject(TYPES.IPasswordService)
		private passwordService: IPasswordService
	) {}

	public async createUser(userData: CreateUserDTO) {
		const { name, email, password, status, roles } = userData

		const existingUser = await this.userRepository.findOne({
			where: { email },
		})

		if (existingUser) {
			throw new AppException('Email already in use!', 409)
		}

		const hashedPassword = await this.passwordService.hashPassword(password)

		const user = await sequelize.transaction(
			async (transaction: Transaction) => {
				const createdUser = await this.userRepository.create(
					{
						name,
						email,
						password: hashedPassword,
						status,
					},
					{ transaction }
				)
				if (!createdUser)
					throw new AppException('User creation failed!', 400)

				if (roles && roles.length > 0) {
					await createdUser.addRoles(roles, { transaction })
				}

				return createdUser
			}
		)

		return user
	}

	public async getAllUsers(options: UserFilterOptions) {
		const { page = 1, perPage = 10, keyword } = options

		const whereClause: WhereOptions = {
			...(keyword && {
				[Op.or]: Role.searchableFields.map((field) => ({
					[field]: { [Op.iLike]: `%${keyword}%` },
				})),
			}),
		}

		const queryOptions: FindAndCountOptions = {
			where: whereClause,
			attributes: ['id', 'name', 'email', 'status'],
			include: [
				{
					model: Role,
					as: 'roles',
					attributes: ['id', 'name', 'description'],
					through: {
						attributes: [],
					},
				},
			],
			distinct: true,
			order: [['id', 'ASC']],
		}
		const users = this.userRepository.findAndPaginate(
			page,
			perPage,
			queryOptions
		)

		return users
	}

	public async updateUser(
		userId: number,
		userData: UpdateUserDTO
	): Promise<User | null> {
		const { name, email, password, status, roles } = userData

		const user = await this.userRepository.findByPk(userId)

		if (!user) {
			throw new AppException('User not found', 404)
		}

		return await sequelize.transaction(async (transaction: Transaction) => {
			let hashedPassword

			if (password !== undefined && password !== '') {
				hashedPassword =
					await this.passwordService.hashPassword(password)
			}

			if (roles) {
				await user.setRoles(roles, { transaction })
			}

			return await user.update(
				{ name, email, password: hashedPassword, status },
				{
					transaction,
				}
			)
		})
	}

	public async getUserById(userId: number) {
		const user = await this.userRepository.findByPk(userId, {
			attributes: { exclude: ['password', 'createdAt', 'updatedAt'] },
			include: [
				{
					model: Role,
					as: 'roles',
					attributes: ['id', 'name', 'description'],
					through: {
						attributes: [],
					},
				},
			],
		})

		if (!user) {
			throw new AppException('User not found!', 404)
		}

		return user
	}

	public async deleteUser(id: number) {
		const user = await this.userRepository.findByPk(id)

		if (!user) {
			throw new AppException('User not found!', 404)
		}

		const deletedCount = await sequelize.transaction(
			async (transaction: Transaction) => {
				return await this.userRepository.delete({
					where: { id },
					transaction,
				})
			}
		)

		return deletedCount > 0
	}

	public async assignRoleToUser(userId: number, roleIds: number[]) {
		const user = await this.userRepository.findByPk(userId)
		if (!user) {
			throw new AppException('User not found!', 404)
		}

		await user.addRoles(roleIds)
	}
}

export default UserService
