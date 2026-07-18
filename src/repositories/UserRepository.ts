import { injectable } from 'inversify'
import { FindOptions, InferAttributes } from 'sequelize'
import { User } from '../models/User'
import { BaseRepository } from './BaseRepository'
import { IUserRepository } from '../interfaces/repository/IUserRepository'

@injectable()
class UserRepository extends BaseRepository<User> implements IUserRepository {
	constructor() {
		super(User)
	}

	findByEmail(email: string, options?: FindOptions<InferAttributes<User>>) {
		return User.findOne({
			where: { email },
			...options,
			raw: true,
		})
	}
}

export default UserRepository
