import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IExchangeRateService } from '../interfaces/service/IExchangeRateService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import appConfig from '../utils/config'
import AppException from '../exceptions/AppException'
import { ExchangeRateFilterOptions } from '../types/exchangeRateTypes'

@injectable()
export class ExchangeRateController {
	constructor(
		@inject(TYPES.IExchangeRateService)
		private exchangeRateService: IExchangeRateService
	) {}

	public getAllExchangeRates = asyncHandler(
		async (req: Request, res: Response) => {
			const options: ExchangeRateFilterOptions = {
				fromCurrencyId: req.query.fromCurrencyId
					? parseInt(req.query.fromCurrencyId as string, 10)
					: undefined,
				toCurrencyId: req.query.toCurrencyId
					? parseInt(req.query.toCurrencyId as string, 10)
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

			const exchangeRates =
				await this.exchangeRateService.getAllExchangeRates(options)

			responseHandler(res, 200, {
				message: 'Exchange rates retrieved successfully',
				data: exchangeRates,
			})
		}
	)

	public getExchangeRateById = asyncHandler(
		async (req: Request, res: Response) => {
			const exchangeRate = await this.exchangeRateService.getExchangeRateById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Exchange rate retrieved successfully',
				data: exchangeRate,
			})
		}
	)

	public createExchangeRate = asyncHandler(
		async (req: Request, res: Response) => {
			const exchangeRate = await this.exchangeRateService.createExchangeRate(
				req.body
			)
			responseHandler(res, 201, {
				message: 'Exchange rate created successfully',
				data: exchangeRate,
			})
		}
	)

	public updateExchangeRate = asyncHandler(
		async (req: Request, res: Response) => {
			const exchangeRate = await this.exchangeRateService.updateExchangeRate(
				parseInt(req.params.id as string, 10),
				req.body
			)
			if (!exchangeRate) {
				return responseHandler(res, 404, {
					message: 'Exchange rate not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Exchange rate updated successfully',
				data: exchangeRate,
			})
		}
	)

	public deleteExchangeRate = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.exchangeRateService.deleteExchangeRate(
				parseInt(req.params.id as string, 10)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Exchange rate not found',
				})
			}
			// Exact wording per the API spec's `DeleteExchangeRate` response.
			responseHandler(res, 200, {
				message: 'Exchange rate deleted.',
			})
		}
	)

	/**
	 * `fromCurrencyId`/`toCurrencyId` are required query params. Since
	 * `zodSchemaValidator` only runs for POST/PUT/PATCH/DELETE (see
	 * `src/validation/zodValidator.ts`), a GET-only endpoint validates its
	 * required query params here rather than relying on a schema, matching
	 * the identical convention in `RateCardController.lookupRateCard`.
	 */
	public getLatestExchangeRate = asyncHandler(
		async (req: Request, res: Response) => {
			const fromCurrencyId = parseInt(req.query.fromCurrencyId as string, 10)
			const toCurrencyId = parseInt(req.query.toCurrencyId as string, 10)

			if (
				!Number.isInteger(fromCurrencyId) ||
				!Number.isInteger(toCurrencyId)
			) {
				throw new AppException(
					'fromCurrencyId and toCurrencyId query parameters are required',
					400
				)
			}

			const exchangeRate =
				await this.exchangeRateService.getLatestExchangeRate({
					fromCurrencyId,
					toCurrencyId,
				})

			responseHandler(res, 200, {
				message: 'Exchange rate retrieved successfully',
				data: exchangeRate,
			})
		}
	)
}
