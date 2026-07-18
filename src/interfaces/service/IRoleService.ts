import { Role } from '../../models/Role'
import { RoleFilterOptions } from '../../types/roleTypes'
import { PaginationResult } from '../../utils/Paginator'

export interface IRoleService {
	createRole(roleData: { name: string; description?: string }): Promise<Role>
	updateRole(
		id: number,
		roleData: { name?: string; description?: string }
	): Promise<Role | null>
	deleteRole(id: number): Promise<boolean>
	getRoleById(id: number): Promise<Role>
	getAllRoles(
		options: RoleFilterOptions
	): Promise<PaginationResult<Role> | Role[]>
}
