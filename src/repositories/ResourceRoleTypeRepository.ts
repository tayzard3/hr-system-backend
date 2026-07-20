import { injectable } from 'inversify'
import { ResourceRoleType } from '../models/ResourceRoleType'
import { IResourceRoleTypeRepository } from '../interfaces/repository/IResourceRoleTypeRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class ResourceRoleTypeRepository
	extends BaseRepository<ResourceRoleType>
	implements IResourceRoleTypeRepository
{
	constructor() {
		super(ResourceRoleType)
	}

	public async findByName(name: string): Promise<ResourceRoleType | null> {
		return this.model.findOne({ where: { name } })
	}
}
