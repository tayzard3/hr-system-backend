import { USER_STATUS } from '../constants'

export interface CreateUserDTO {
	name: string
	email: string
	password: string
	status: (typeof USER_STATUS)[keyof typeof USER_STATUS]
	roles: number[]
}

export interface UserFilterOptions {
	page?: number
	perPage?: number
	keyword?: string
}

export interface UpdateUserDTO {
	name: string
	email: string
	password?: string | undefined
	status: (typeof USER_STATUS)[keyof typeof USER_STATUS]
	roles: number[]
}

export interface UserWithRelations {
	id: number
	name: string
	email: string
	status: string
	roles: string
	permissions: string
}

export interface AuthenticatedUser {
	id: number
	email: string
	name: string
	roles: string[]
	permissions: string[]
}
