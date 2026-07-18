import { Permission } from '../../models/Permission'
import { IBaseRepository } from './IBaseRepository'

export interface IPermissionRepository extends IBaseRepository<Permission> {
	findByName(name: string): Promise<Permission | null>
}
