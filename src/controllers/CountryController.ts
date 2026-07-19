import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { ICountryService } from '../interfaces/service/ICountryService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'

@injectable()
export class CountryController {
	constructor(
		@inject(TYPES.ICountryService) private countryService: ICountryService
	) {}

	public getAllCountries = asyncHandler(
		async (req: Request, res: Response) => {
			const options = {
				page: parseInt(req.query.page as string, 10) || 1,
				perPage: parseInt(req.query.perPage as string, 10),
				keyword: req.query.keyword as string | undefined,
			}

			const countries = await this.countryService.getAllCountries(options)

			responseHandler(res, 200, {
				message: 'Countries retrieved successfully',
				data: countries,
			})
		}
	)

	public createCountry = asyncHandler(async (req: Request, res: Response) => {
		const country = await this.countryService.createCountry(req.body)
		responseHandler(res, 201, {
			message: 'Country created successfully',
			data: country,
		})
	})

	public getCountryById = asyncHandler(
		async (req: Request, res: Response) => {
			const country = await this.countryService.getCountryById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Country retrieved successfully',
				data: country,
			})
		}
	)

	public updateCountry = asyncHandler(async (req: Request, res: Response) => {
		const country = await this.countryService.updateCountry(
			parseInt(req.params.id as string, 10),
			req.body
		)
		if (!country) {
			return responseHandler(res, 404, { message: 'Country not found' })
		}
		responseHandler(res, 200, {
			message: 'Country updated successfully',
			data: country,
		})
	})

	public deleteCountry = asyncHandler(async (req: Request, res: Response) => {
		const deleted = await this.countryService.deleteCountry(
			parseInt(req.params.id as string, 10)
		)
		if (!deleted) {
			return responseHandler(res, 404, { message: 'Country not found' })
		}
		responseHandler(res, 200, { message: 'Country deleted successfully' })
	})
}
