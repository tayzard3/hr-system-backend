import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IPermissionService } from '../interfaces/service/IPermissionService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'

@injectable()
export class PermissionController {
	constructor(
		@inject(TYPES.IPermissionService)
		private permissionService: IPermissionService
	) {}

	public getAllPermissions = asyncHandler(
		async (req: Request, res: Response) => {
			const options = {
				page: parseInt(req.query.page as string, 10) || 1,
				perPage: parseInt(req.query.perPage as string, 10),
				keyword: req.query.keyword as string | undefined,
			}

			const permissions =
				await this.permissionService.getAllPermissions(options)

			responseHandler(res, 200, {
				message: 'Permissions retrieved successfully',
				data: permissions,
			})
		}
	)

	public createPermission = asyncHandler(
		async (req: Request, res: Response) => {
			const permission = await this.permissionService.createPermission(
				req.body
			)
			responseHandler(res, 201, {
				message: 'Permission created successfully',
				data: permission,
			})
		}
	)

	public getPermissionById = asyncHandler(
		async (req: Request, res: Response) => {
			const permission = await this.permissionService.getPermissionById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Permission retrieved successfully',
				data: permission,
			})
		}
	)

	public updatePermission = asyncHandler(
		async (req: Request, res: Response) => {
			const permission = await this.permissionService.updatePermission(
				parseInt(req.params.id as string, 10),
				req.body
			)
			if (!permission) {
				return responseHandler(res, 404, {
					message: 'Permission not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Permission updated successfully',
				data: permission,
			})
		}
	)

	public deletePermission = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.permissionService.deletePermission(
				parseInt(req.params.id as string, 10)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Permission not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Permission deleted successfully',
			})
		}
	)
}
