import { injectable } from 'inversify'
import { Role } from '../models/Role'
import { IRoleRepository } from '../interfaces/repository/IRoleRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class RoleRepository
	extends BaseRepository<Role>
	implements IRoleRepository
{
	constructor() {
		super(Role)
	}

	public async findByName(name: string): Promise<Role | null> {
		return this.model.findOne({ where: { name } })
	}
}
