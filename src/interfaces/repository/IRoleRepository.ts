import { Role } from '../../models/Role'
import { IBaseRepository } from './IBaseRepository'

export interface IRoleRepository extends IBaseRepository<Role> {
	findByName(name: string): Promise<Role | null>
}
