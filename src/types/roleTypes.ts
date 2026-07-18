export interface RoleFilterOptions {
	page: number
	perPage?: number | undefined
	keyword?: string | undefined
	isDeveloper: boolean
}

export interface CreateRoleDTO {
	name: string
	description?: string
	permissions?: number[]
}

export interface UpdateRoleDTO {
	name?: string
	description?: string
	permissions?: number[]
}
