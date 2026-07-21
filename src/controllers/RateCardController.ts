import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IRateCardService } from '../interfaces/service/IRateCardService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import appConfig from '../utils/config'
import AppException from '../exceptions/AppException'
import { RateCardFilterOptions } from '../types/rateCardTypes'

@injectable()
export class RateCardController {
	constructor(
		@inject(TYPES.IRateCardService)
		private rateCardService: IRateCardService
	) {}

	public getAllRateCards = asyncHandler(
		async (req: Request, res: Response) => {
			const options: RateCardFilterOptions = {
				countryId: req.query.countryId
					? parseInt(req.query.countryId as string, 10)
					: undefined,
				resourceRoleTypeId: req.query.resourceRoleTypeId
					? parseInt(req.query.resourceRoleTypeId as string, 10)
					: undefined,
				currencyId: req.query.currencyId
					? parseInt(req.query.currencyId as string, 10)
					: undefined,
				isActive:
					req.query.isActive !== undefined
						? req.query.isActive === 'true'
						: undefined,
				effectiveDate: req.query.effectiveDate as string | undefined,
				page: parseInt(req.query.page as string, 10) || 1,
				perPage:
					parseInt(req.query.pageSize as string, 10) ||
					parseInt(appConfig.DEFAULT_PAGINATE, 10),
			}

			const rateCards = await this.rateCardService.getAllRateCards(options)

			responseHandler(res, 200, {
				message: 'Rate cards retrieved successfully',
				data: rateCards,
			})
		}
	)

	public getRateCardById = asyncHandler(
		async (req: Request, res: Response) => {
			const rateCard = await this.rateCardService.getRateCardById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Rate card retrieved successfully',
				data: rateCard,
			})
		}
	)

	public createRateCard = asyncHandler(
		async (req: Request, res: Response) => {
			const rateCard = await this.rateCardService.createRateCard(req.body)
			responseHandler(res, 201, {
				message: 'Rate card created successfully',
				data: rateCard,
			})
		}
	)

	public updateRateCard = asyncHandler(
		async (req: Request, res: Response) => {
			const rateCard = await this.rateCardService.updateRateCard(
				parseInt(req.params.id as string, 10),
				req.body
			)
			if (!rateCard) {
				return responseHandler(res, 404, {
					message: 'Rate card not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Rate card updated successfully',
				data: rateCard,
			})
		}
	)

	public deleteRateCard = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.rateCardService.deleteRateCard(
				parseInt(req.params.id as string, 10)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Rate card not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Rate card deleted successfully',
			})
		}
	)

	/**
	 * `countryId`/`resourceRoleTypeId` are required query params. Since
	 * `zodSchemaValidator` only runs for POST/PUT/PATCH/DELETE (see
	 * `src/validation/zodValidator.ts`), a GET-only endpoint validates its
	 * required query params here rather than relying on a schema, matching
	 * the absence of an established GET-query-validation convention
	 * elsewhere in this codebase.
	 */
	public lookupRateCard = asyncHandler(
		async (req: Request, res: Response) => {
			const countryId = parseInt(req.query.countryId as string, 10)
			const resourceRoleTypeId = parseInt(
				req.query.resourceRoleTypeId as string,
				10
			)

			if (!Number.isInteger(countryId) || !Number.isInteger(resourceRoleTypeId)) {
				throw new AppException(
					'countryId and resourceRoleTypeId query parameters are required',
					400
				)
			}

			const asOfDate = req.query.asOfDate as string | undefined
			if (asOfDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) {
				throw new AppException(
					'asOfDate must be a date in YYYY-MM-DD format',
					400
				)
			}

			const rateCard = await this.rateCardService.lookupRateCard({
				countryId,
				resourceRoleTypeId,
				asOfDate,
			})

			responseHandler(res, 200, {
				message: 'Rate card retrieved successfully',
				data: rateCard,
			})
		}
	)
}
