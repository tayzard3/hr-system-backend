import { ResourceRoleType } from '../../models/ResourceRoleType'
import { IBaseRepository } from './IBaseRepository'

export interface IResourceRoleTypeRepository
	extends IBaseRepository<ResourceRoleType> {
	findByName(name: string): Promise<ResourceRoleType | null>
}
