export interface PermissionFilterOptions {
	page: number
	perPage?: number | undefined
	keyword?: string | undefined
}

export interface CreatePermissionDTO {
	name: string
	description?: string
	roles?: number[]
}

export interface UpdatePermissionDTO {
	name?: string
	description?: string
	roles?: number[]
}
