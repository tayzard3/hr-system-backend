import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import { IUserService } from '../interfaces/service/IUserService'
import { TYPES } from '../containers/inversifyTypes'

@injectable()
export default class UserController {
	constructor(
		@inject(TYPES.IUserService) private userService: IUserService
	) {}

	public getAllUsers = asyncHandler(async (req: Request, res: Response) => {
		const options = {
			page: parseInt(req.query.page as string, 10) || 1,
			perPage: parseInt(req.query.perPage as string, 10) || 10,
			keyword: req.query.keyword as string | undefined,
		}

		const users = await this.userService.getAllUsers(options)
		responseHandler(res, 200, {
			message: 'User retrieved successfully',
			data: users,
		})
	})

	public createUser = asyncHandler(async (req: Request, res: Response) => {
		const user = await this.userService.createUser(req.body)
		responseHandler(res, 201, {
			message: 'User created successfully',
			data: user,
		})
	})

	public updateUser = asyncHandler(async (req: Request, res: Response) => {
		const user = await this.userService.updateUser(
			parseInt(req.params.userId as string),
			req.body
		)

		responseHandler(res, 200, {
			message: 'User updated successfully',
			data: user,
		})
	})

	public getUserById = asyncHandler(async (req: Request, res: Response) => {
		const user = await this.userService.getUserById(
			parseInt(req.params.userId as string)
		)
		responseHandler(res, 200, {
			message: 'User retrieved successfully',
			data: user,
		})
	})

	public deleteUser = asyncHandler(async (req: Request, res: Response) => {
		await this.userService.deleteUser(parseInt(req.params.userId as string))

		responseHandler(res, 200, { message: 'User deleted successfully' })
	})

	public assignRole = asyncHandler(async (req: Request, res: Response) => {
		const { userId, roleId } = req.body
		await this.userService.assignRoleToUser(userId, roleId)
		responseHandler(res, 200, {
			message: 'Role assigned successfully',
		})
	})
}
