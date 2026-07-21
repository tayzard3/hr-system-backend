import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { ICurrencyService } from '../interfaces/service/ICurrencyService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import { CurrencyFilterOptions } from '../types/currencyTypes'

@injectable()
export class CurrencyController {
	constructor(
		@inject(TYPES.ICurrencyService)
		private currencyService: ICurrencyService
	) {}

	public getAllCurrencies = asyncHandler(
		async (req: Request, res: Response) => {
			const options: CurrencyFilterOptions = {
				page: parseInt(req.query.page as string, 10) || 1,
				perPage: parseInt(req.query.perPage as string, 10) || undefined,
				keyword: req.query.keyword as string | undefined,
				isActive:
					req.query.isActive !== undefined
						? req.query.isActive === 'true'
						: undefined,
			}

			const currencies =
				await this.currencyService.getAllCurrencies(options)

			responseHandler(res, 200, {
				message: 'Currencies retrieved successfully',
				data: currencies,
			})
		}
	)

	public createCurrency = asyncHandler(
		async (req: Request, res: Response) => {
			const currency = await this.currencyService.createCurrency(req.body)
			responseHandler(res, 201, {
				message: 'Currency created successfully',
				data: currency,
			})
		}
	)

	public getCurrencyById = asyncHandler(
		async (req: Request, res: Response) => {
			const currency = await this.currencyService.getCurrencyById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Currency retrieved successfully',
				data: currency,
			})
		}
	)

	public updateCurrency = asyncHandler(
		async (req: Request, res: Response) => {
			const currency = await this.currencyService.updateCurrency(
				parseInt(req.params.id as string, 10),
				req.body
			)
			if (!currency) {
				return responseHandler(res, 404, {
					message: 'Currency not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Currency updated successfully',
				data: currency,
			})
		}
	)

	public deleteCurrency = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.currencyService.deleteCurrency(
				parseInt(req.params.id as string, 10)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Currency not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Currency deleted successfully',
			})
		}
	)
}
