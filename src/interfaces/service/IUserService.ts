import { User } from '../../models/User'
import {
	CreateUserDTO,
	UpdateUserDTO,
	UserFilterOptions,
} from '../../types/userTypes'

import { PaginationResult } from '../../utils/Paginator'

export interface IUserService {
	createUser(userData: CreateUserDTO): Promise<User>
	getAllUsers(options: UserFilterOptions): Promise<PaginationResult<User>>
	getUserById(userId: number): Promise<User>
	updateUser(userId: number, userData: UpdateUserDTO): Promise<User | null>
	deleteUser(id: number): Promise<boolean>
	assignRoleToUser(userId: number, roleIds: number[]): Promise<void>
}
