import { Permission } from '../../models/Permission'
import { PermissionFilterOptions } from '../../types/permissionTypes'
import { PaginationResult } from '../../utils/Paginator'

export interface IPermissionService {
	createPermission(permissionData: {
		name: string
		description?: string
	}): Promise<Permission>
	updatePermission(
		id: number,
		permissionData: { name?: string; description?: string }
	): Promise<Permission | null>
	deletePermission(id: number): Promise<boolean>
	getPermissionById(id: number): Promise<Permission>
	getAllPermissions(
		options: PermissionFilterOptions
	): Promise<PaginationResult<Permission> | Permission[]>
}
