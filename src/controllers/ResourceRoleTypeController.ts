import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IResourceRoleTypeService } from '../interfaces/service/IResourceRoleTypeService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import appConfig from '../utils/config'

@injectable()
export class ResourceRoleTypeController {
	constructor(
		@inject(TYPES.IResourceRoleTypeService)
		private resourceRoleTypeService: IResourceRoleTypeService
	) {}

	public getAllResourceRoleTypes = asyncHandler(
		async (req: Request, res: Response) => {
			const options = {
				page: parseInt(req.query.page as string, 10) || 1,
				perPage:
					parseInt(req.query.perPage as string, 10) ||
					parseInt(appConfig.DEFAULT_PAGINATE, 10),
				keyword: req.query.keyword as string | undefined,
			}

			const resourceRoleTypes =
				await this.resourceRoleTypeService.getAllResourceRoleTypes(options)

			responseHandler(res, 200, {
				message: 'Resource role types retrieved successfully',
				data: resourceRoleTypes,
			})
		}
	)

	public createResourceRoleType = asyncHandler(
		async (req: Request, res: Response) => {
			const resourceRoleType =
				await this.resourceRoleTypeService.createResourceRoleType(req.body)
			responseHandler(res, 201, {
				message: 'Resource role type created successfully',
				data: resourceRoleType,
			})
		}
	)

	public getResourceRoleTypeById = asyncHandler(
		async (req: Request, res: Response) => {
			const resourceRoleType =
				await this.resourceRoleTypeService.getResourceRoleTypeById(
					parseInt(req.params.id as string, 10)
				)
			responseHandler(res, 200, {
				message: 'Resource role type retrieved successfully',
				data: resourceRoleType,
			})
		}
	)

	public updateResourceRoleType = asyncHandler(
		async (req: Request, res: Response) => {
			const resourceRoleType =
				await this.resourceRoleTypeService.updateResourceRoleType(
					parseInt(req.params.id as string, 10),
					req.body
				)
			if (!resourceRoleType) {
				return responseHandler(res, 404, {
					message: 'Resource role type not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Resource role type updated successfully',
				data: resourceRoleType,
			})
		}
	)

	public deleteResourceRoleType = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.resourceRoleTypeService.deleteResourceRoleType(
				parseInt(req.params.id as string, 10)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Resource role type not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Resource role type deleted successfully',
			})
		}
	)
}
