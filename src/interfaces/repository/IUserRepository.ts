import { FindOptions, InferAttributes } from 'sequelize'
import { IBaseRepository } from './IBaseRepository'
import { User } from '../../models/User'

export interface IUserRepository extends IBaseRepository<User> {
	findByEmail(
		email: string,
		options?: FindOptions<InferAttributes<User>>
	): Promise<InferAttributes<User> | null>
}
