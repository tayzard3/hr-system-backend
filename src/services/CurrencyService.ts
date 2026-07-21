import { injectable, inject } from 'inversify'
import { FindAndCountOptions, FindOptions, Op, WhereOptions } from 'sequelize'
import { ICurrencyService } from '../interfaces/service/ICurrencyService'
import { ICurrencyRepository } from '../interfaces/repository/ICurrencyRepository'
import { Currency } from '../models/Currency'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	CreateCurrencyDTO,
	CurrencyFilterOptions,
	UpdateCurrencyDTO,
} from '../types/currencyTypes'

@injectable()
export class CurrencyService implements ICurrencyService {
	constructor(
		@inject(TYPES.ICurrencyRepository)
		private currencyRepository: ICurrencyRepository
	) {}

	public async getAllCurrencies(options: CurrencyFilterOptions) {
		const { page, perPage, keyword, isActive } = options

		const whereClause: WhereOptions = {
			...(typeof isActive === 'boolean' && { isActive }),
			...(keyword && {
				[Op.or]: Currency.searchableFields.map((field) => ({
					// MySQL's default collation is case-insensitive, so a plain
					// `LIKE` behaves the way an `ILIKE` would on Postgres - see
					// the identical note in `ProjectService.getAllProjects`.
					[field]: { [Op.like]: `%${keyword}%` },
				})),
			}),
		}

		const queryOptions: FindAndCountOptions | FindOptions = {
			where: whereClause,
			attributes: [
				'id',
				'code',
				'name',
				'symbol',
				'isBaseCurrency',
				'isActive',
			],
			order: [['name', 'ASC']],
		}

		if (perPage) {
			return this.currencyRepository.findAndPaginate(
				page,
				perPage,
				queryOptions as FindAndCountOptions
			)
		}

		return this.currencyRepository.find(queryOptions as FindOptions)
	}

	public async createCurrency(
		currencyData: CreateCurrencyDTO
	): Promise<Currency> {
		const code = currencyData.code.toUpperCase()

		const existingCurrency = await this.currencyRepository.findByCode(code)
		if (existingCurrency) {
			throw new AppException(
				'Currency with this code already exists',
				409
			)
		}

		if (currencyData.isBaseCurrency) {
			await this.assertNoConflictingBaseCurrency()
		}

		const currency = await this.currencyRepository.create({
			...currencyData,
			code,
		})

		if (!currency) {
			throw new AppException('Failed to create currency', 500)
		}

		return currency
	}

	public async getCurrencyById(id: number): Promise<Currency> {
		const currency = await this.currencyRepository.findByPk(id, {
			attributes: [
				'id',
				'code',
				'name',
				'symbol',
				'isBaseCurrency',
				'isActive',
			],
		})

		if (!currency) {
			throw new AppException('Currency not found', 404)
		}

		return currency
	}

	public async updateCurrency(
		id: number,
		currencyData: UpdateCurrencyDTO
	): Promise<Currency | null> {
		const currency = await this.currencyRepository.findByPk(id)
		if (!currency) {
			return null
		}

		const updateData: UpdateCurrencyDTO = { ...currencyData }

		if (updateData.code) {
			const code = updateData.code.toUpperCase()
			const existingCurrency =
				await this.currencyRepository.findByCode(code)
			if (existingCurrency && existingCurrency.id !== id) {
				throw new AppException(
					'Currency with this code already exists',
					409
				)
			}
			updateData.code = code
		}

		if (updateData.isBaseCurrency) {
			await this.assertNoConflictingBaseCurrency(id)
		}

		// Note: this project's DB dialect is MySQL, which does not support
		// `RETURNING`. Updating the already-fetched instance directly avoids
		// relying on it - see the identical note in `CountryService.updateCountry`.
		return await sequelize.transaction(async (transaction) => {
			return currency.update(updateData, { transaction })
		})
	}

	public async deleteCurrency(id: number): Promise<boolean> {
		const currency = await this.currencyRepository.findByPk(id)
		if (!currency) {
			return false
		}

		if (currency.isBaseCurrency) {
			throw new AppException(
				'Cannot delete the active base currency. Assign a new base currency first.',
				409
			)
		}

		// Note: `currencies` currently has no incoming foreign keys (no
		// ExchangeRate/Invoice/RateCard model or association exists yet in this
		// codebase), so there is no "referenced by" guard beyond the
		// base-currency check above - same caveat as
		// `CountryService.deleteCountry` / `ResourceRoleTypeService.
		// deleteResourceRoleType`. Revisit once those associations land, per the
		// API spec's deletion rule ("fails if referenced by exchange rates/
		// invoices/rate cards").
		const deletedCount = await this.currencyRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}

	/**
	 * Mirrors the DB's `currencies_active_base_currency_uidx` unique index
	 * (generated `active_base_currency_marker` column - see the Currency
	 * migration) at the application layer, so attempting to mark a second
	 * currency as the base currency fails with a clean 409 rather than a raw
	 * DB unique-constraint error. The DB index remains the authoritative
	 * backstop (e.g. for concurrent requests racing this check).
	 */
	private async assertNoConflictingBaseCurrency(
		excludeId?: number
	): Promise<void> {
		const conflictingBaseCurrency =
			await this.currencyRepository.findActiveBaseCurrency(excludeId)

		if (conflictingBaseCurrency) {
			throw new AppException(
				`Currency ${conflictingBaseCurrency.code} is already set as the base currency. Unset it before assigning a new base currency.`,
				409
			)
		}
	}
}
