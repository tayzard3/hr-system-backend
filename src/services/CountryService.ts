import { injectable, inject } from 'inversify'
import { FindAndCountOptions, FindOptions, Op, WhereOptions } from 'sequelize'
import { ICountryService } from '../interfaces/service/ICountryService'
import { ICountryRepository } from '../interfaces/repository/ICountryRepository'
import { Country } from '../models/Country'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	CountryFilterOptions,
	CreateCountryDTO,
	UpdateCountryDTO,
} from '../types/countryTypes'

@injectable()
export class CountryService implements ICountryService {
	constructor(
		@inject(TYPES.ICountryRepository)
		private countryRepository: ICountryRepository
	) {}

	public async getAllCountries(options: CountryFilterOptions) {
		const { page, perPage, keyword } = options

		const whereClause: WhereOptions = {
			...(keyword && {
				[Op.or]: Country.searchableFields.map((field) => ({
					[field]: { [Op.iLike]: `%${keyword}%` },
				})),
			}),
		}

		const queryOptions: FindAndCountOptions | FindOptions = {
			where: whereClause,
			attributes: ['id', 'code', 'name'],
			order: [['name', 'ASC']],
		}

		if (perPage) {
			return this.countryRepository.findAndPaginate(
				page,
				perPage,
				queryOptions as FindAndCountOptions
			)
		}

		return this.countryRepository.find(queryOptions as FindOptions)
	}

	public async createCountry(countryData: CreateCountryDTO): Promise<Country> {
		const code = countryData.code.toUpperCase()

		const existingCountry = await this.countryRepository.findByCode(code)
		if (existingCountry) {
			throw new AppException('Country with this code already exists', 409)
		}

		const country = await this.countryRepository.create({
			...countryData,
			code,
		})

		if (!country) {
			throw new AppException('Failed to create country', 500)
		}

		return country
	}

	public async getCountryById(id: number): Promise<Country> {
		const country = await this.countryRepository.findByPk(id, {
			attributes: ['id', 'code', 'name'],
		})

		if (!country) {
			throw new AppException('Country not found', 404)
		}

		return country
	}

	public async updateCountry(
		id: number,
		countryData: UpdateCountryDTO
	): Promise<Country | null> {
		const country = await this.countryRepository.findByPk(id)
		if (!country) {
			return null
		}

		const updateData: UpdateCountryDTO = { ...countryData }

		if (updateData.code) {
			const code = updateData.code.toUpperCase()
			const existingCountry = await this.countryRepository.findByCode(code)
			if (existingCountry && existingCountry.id !== id) {
				throw new AppException('Country with this code already exists', 409)
			}
			updateData.code = code
		}

		// Note: this project's DB dialect is MySQL, which does not support
		// `RETURNING`. `BaseRepository.update()` with `returning: true`
		// therefore resolves as `[affectedCount]` (a bare number, not
		// `[affectedCount, affectedRows]`), so destructuring the second
		// element previously produced `1` instead of the updated row -
		// causing `updatedCountries[0]` to be `undefined` and the API to
		// always respond 404. Updating the already-fetched instance
		// directly avoids relying on `RETURNING` and works consistently
		// across dialects.
		return await sequelize.transaction(async (transaction) => {
			return country.update(updateData, { transaction })
		})
	}

	public async deleteCountry(id: number): Promise<boolean> {
		const country = await this.countryRepository.findByPk(id)
		if (!country) {
			return false
		}

		// Note: `countries` currently has no incoming foreign keys (no
		// User/RateCard association exists yet in this codebase), so there is
		// no "referenced by" guard here. Revisit this once Users or RateCards
		// gain a countryId association, per the API spec's deletion rule.
		const deletedCount = await this.countryRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}
}
