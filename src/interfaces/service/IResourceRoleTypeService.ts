import { ResourceRoleType } from '../../models/ResourceRoleType'
import {
	CreateResourceRoleTypeDTO,
	ResourceRoleTypeFilterOptions,
	UpdateResourceRoleTypeDTO,
} from '../../types/resourceRoleTypeTypes'
import { PaginationResult } from '../../utils/Paginator'

export interface IResourceRoleTypeService {
	createResourceRoleType(
		resourceRoleTypeData: CreateResourceRoleTypeDTO
	): Promise<ResourceRoleType>
	updateResourceRoleType(
		id: number,
		resourceRoleTypeData: UpdateResourceRoleTypeDTO
	): Promise<ResourceRoleType | null>
	deleteResourceRoleType(id: number): Promise<boolean>
	getResourceRoleTypeById(id: number): Promise<ResourceRoleType>
	getAllResourceRoleTypes(
		options: ResourceRoleTypeFilterOptions
	): Promise<PaginationResult<ResourceRoleType> | ResourceRoleType[]>
}
