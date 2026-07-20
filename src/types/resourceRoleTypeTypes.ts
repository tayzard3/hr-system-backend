export interface ResourceRoleTypeFilterOptions {
	page: number
	perPage?: number
	/** Matches against `ResourceRoleType.searchableFields` (name). */
	keyword?: string
}

export interface CreateResourceRoleTypeDTO {
	name: string
	description?: string | null
}

export interface UpdateResourceRoleTypeDTO {
	name?: string
	description?: string | null
}
