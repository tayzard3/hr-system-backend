import { injectable } from 'inversify'
import { Permission } from '../models/Permission'
import { IPermissionRepository } from '../interfaces/repository/IPermissionRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class PermissionRepository
	extends BaseRepository<Permission>
	implements IPermissionRepository
{
	constructor() {
		super(Permission)
	}

	public async findByName(name: string): Promise<Permission | null> {
		return this.model.findOne({ where: { name } })
	}
}
