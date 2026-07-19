import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IRoleService } from '../interfaces/service/IRoleService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import { DEFAULT_ROLE } from '../constants'

@injectable()
export class RoleController {
	constructor(
		@inject(TYPES.IRoleService) private roleService: IRoleService
	) {}

	public getAllRoles = asyncHandler(async (req: Request, res: Response) => {
		const options = {
			page: parseInt(req.query.page as string, 10) || 1,
			perPage: parseInt(req.query.perPage as string, 10),
			keyword: req.query.keyword as string | undefined,
			isDeveloper:
				req.user.roles.includes(DEFAULT_ROLE.DEVELOPER) || false,
		}

		const roles = await this.roleService.getAllRoles(options)

		responseHandler(res, 200, {
			message: 'Roles retrieved successfully',
			data: roles,
		})
	})

	public createRole = asyncHandler(async (req: Request, res: Response) => {
		const role = await this.roleService.createRole(req.body)
		responseHandler(res, 201, {
			message: 'Role created successfully',
			data: role,
		})
	})

	public getRoleById = asyncHandler(async (req: Request, res: Response) => {
		const role = await this.roleService.getRoleById(
			parseInt(req.params.id as string, 10)
		)
		responseHandler(res, 200, {
			message: 'Role retrieved successfully',
			data: role,
		})
	})

	public updateRole = asyncHandler(async (req: Request, res: Response) => {
		const role = await this.roleService.updateRole(
			parseInt(req.params.id as string, 10),
			req.body
		)
		if (!role) {
			return responseHandler(res, 404, { message: 'Role not found' })
		}
		responseHandler(res, 200, {
			message: 'Role updated successfully',
			data: role,
		})
	})

	public deleteRole = asyncHandler(async (req: Request, res: Response) => {
		const deleted = await this.roleService.deleteRole(
			parseInt(req.params.id as string, 10)
		)
		if (!deleted) {
			return responseHandler(res, 404, { message: 'Role not found' })
		}
		responseHandler(res, 204, { message: 'Role deleted successfully' })
	})
}
