import { injectable, inject } from 'inversify'
import { WhereOptions, Op } from 'sequelize'
import { IExchangeRateService } from '../interfaces/service/IExchangeRateService'
import { IExchangeRateRepository } from '../interfaces/repository/IExchangeRateRepository'
import { ICurrencyRepository } from '../interfaces/repository/ICurrencyRepository'
import { ExchangeRate } from '../models/ExchangeRate'
import { Currency } from '../models/Currency'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import { PaginationResult } from '../utils/Paginator'
import {
	CreateExchangeRateDTO,
	ExchangeRateFilterOptions,
	ExchangeRateLookupOptions,
	ExchangeRateResponseDTO,
	UpdateExchangeRateDTO,
} from '../types/exchangeRateTypes'

const EXCHANGE_RATE_INCLUDE = [
	{ model: Currency, as: 'fromCurrency', attributes: ['id', 'code', 'symbol'] },
	{ model: Currency, as: 'toCurrency', attributes: ['id', 'code', 'symbol'] },
]

@injectable()
export class ExchangeRateService implements IExchangeRateService {
	constructor(
		@inject(TYPES.IExchangeRateRepository)
		private exchangeRateRepository: IExchangeRateRepository,
		@inject(TYPES.ICurrencyRepository)
		private currencyRepository: ICurrencyRepository
	) {}

	private buildResponseDTO(
		exchangeRate: ExchangeRate,
		fromCurrency: Currency,
		toCurrency: Currency
	): ExchangeRateResponseDTO {
		return {
			id: exchangeRate.id,
			fromCurrency: {
				id: fromCurrency.id,
				code: fromCurrency.code,
				symbol: fromCurrency.symbol,
			},
			toCurrency: {
				id: toCurrency.id,
				code: toCurrency.code,
				symbol: toCurrency.symbol,
			},
			// `rate` (DECIMAL) is returned as a string by Sequelize — see the
			// note in `src/models/ExchangeRate.ts`.
			rate: Number(exchangeRate.rate),
			effectiveDate: exchangeRate.effectiveDate,
			isActive: exchangeRate.isActive,
			createdAt: exchangeRate.createdAt,
		}
	}

	/** Associations are only guaranteed present when the query that produced
	 * `exchangeRate` requested them via `include` (`EXCHANGE_RATE_INCLUDE`,
	 * used by `getAllExchangeRates`/`getExchangeRateById`/
	 * `getLatestExchangeRate` below) — guarded rather than asserted so a
	 * future call site that forgets the `include` fails loudly instead of
	 * serializing `undefined` (same convention as
	 * `RateCardService.toResponseDTO`). */
	private toResponseDTO(exchangeRate: ExchangeRate): ExchangeRateResponseDTO {
		const { fromCurrency, toCurrency } = exchangeRate
		if (!fromCurrency || !toCurrency) {
			throw new AppException('Failed to load exchange rate details', 500)
		}
		return this.buildResponseDTO(exchangeRate, fromCurrency, toCurrency)
	}

	/**
	 * Mirrors the DB's `exchange_rates_active_pair_effective_uidx` unique
	 * index (generated `active_exchange_rate_marker` column — see the
	 * `exchange_rates` migration) at the application layer, so attempting to
	 * create/reactivate a second active exchange rate for the same
	 * from/to-currency pair + effective date fails with a clean 409 rather
	 * than a raw DB unique-constraint error. The DB index remains the
	 * authoritative backstop (e.g. for concurrent requests racing this
	 * check).
	 */
	private async assertNoConflictingActiveRate(
		fromCurrencyId: number,
		toCurrencyId: number,
		effectiveDate: string,
		excludeId?: number
	): Promise<void> {
		const conflict =
			await this.exchangeRateRepository.findActiveByPairAndEffectiveDate(
				fromCurrencyId,
				toCurrencyId,
				effectiveDate,
				excludeId
			)

		if (conflict) {
			throw new AppException(
				'An active exchange rate already exists for this currency pair and effective date',
				409
			)
		}
	}

	public async getAllExchangeRates(
		options: ExchangeRateFilterOptions
	): Promise<PaginationResult<ExchangeRateResponseDTO>> {
		const { fromCurrencyId, toCurrencyId, isActive, effectiveDate, page, perPage } =
			options

		const whereClause: WhereOptions = {
			...(fromCurrencyId !== undefined && { fromCurrencyId }),
			...(toCurrencyId !== undefined && { toCurrencyId }),
			...(isActive !== undefined && { isActive }),
			...(effectiveDate !== undefined && {
				effectiveDate: { [Op.lte]: effectiveDate },
			}),
		}

		const paginated = await this.exchangeRateRepository.findAndPaginate(
			page,
			perPage,
			{
				where: whereClause,
				include: EXCHANGE_RATE_INCLUDE,
				order: [
					['effectiveDate', 'DESC'],
					['id', 'DESC'],
				],
			}
		)

		return {
			...paginated,
			data: paginated.data.map((exchangeRate) => this.toResponseDTO(exchangeRate)),
		}
	}

	public async getExchangeRateById(id: number): Promise<ExchangeRateResponseDTO> {
		const exchangeRate = await this.exchangeRateRepository.findByPk(id, {
			include: EXCHANGE_RATE_INCLUDE,
		})

		if (!exchangeRate) {
			throw new AppException('Exchange rate not found', 404)
		}

		return this.toResponseDTO(exchangeRate)
	}

	public async createExchangeRate(
		data: CreateExchangeRateDTO
	): Promise<ExchangeRateResponseDTO> {
		const { fromCurrencyId, toCurrencyId, effectiveDate } = data
		const isActive = data.isActive ?? true

		// Defense-in-depth alongside `createExchangeRateSchema`'s `refine` —
		// keeps this invariant enforced even for callers that bypass the zod
		// schema (e.g. a future internal service calling `createExchangeRate`
		// directly).
		if (fromCurrencyId === toCurrencyId) {
			throw new AppException(
				'fromCurrencyId and toCurrencyId must be different',
				400
			)
		}

		const fromCurrency = await this.currencyRepository.findByPk(fromCurrencyId)
		if (!fromCurrency) {
			throw new AppException('From currency not found', 404)
		}

		const toCurrency = await this.currencyRepository.findByPk(toCurrencyId)
		if (!toCurrency) {
			throw new AppException('To currency not found', 404)
		}

		// Application-level pre-check for the common case; see
		// `assertNoConflictingActiveRate`'s doc-comment for the DB-level
		// backstop. An inactive rate never conflicts, so this only runs when
		// the rate being created would actually be active.
		if (isActive) {
			await this.assertNoConflictingActiveRate(
				fromCurrencyId,
				toCurrencyId,
				effectiveDate
			)
		}

		const exchangeRate = await sequelize.transaction(async (transaction) => {
			return this.exchangeRateRepository.create(
				{
					fromCurrencyId,
					toCurrencyId,
					rate: data.rate.toFixed(6),
					effectiveDate,
					isActive,
				},
				{ transaction }
			)
		})

		if (!exchangeRate) {
			throw new AppException('Failed to create exchange rate', 500)
		}

		return this.buildResponseDTO(exchangeRate, fromCurrency, toCurrency)
	}

	public async updateExchangeRate(
		id: number,
		data: UpdateExchangeRateDTO
	): Promise<ExchangeRateResponseDTO | null> {
		const exchangeRate = await this.exchangeRateRepository.findByPk(id, {
			include: EXCHANGE_RATE_INCLUDE,
		})
		if (!exchangeRate) {
			return null
		}

		const { fromCurrency, toCurrency } = exchangeRate
		if (!fromCurrency || !toCurrency) {
			throw new AppException('Failed to load exchange rate details', 500)
		}

		const nextEffectiveDate = data.effectiveDate ?? exchangeRate.effectiveDate
		const nextIsActive = data.isActive ?? exchangeRate.isActive

		// Re-validate the uniqueness rule whenever the row would end up active
		// for a (possibly new) effective date — covers reactivating a rate or
		// moving its effective date. `fromCurrencyId`/`toCurrencyId` are
		// immutable via this endpoint (see `UpdateExchangeRateDTO`), so only
		// `effectiveDate`/`isActive` changes can introduce a new conflict.
		if (
			nextIsActive &&
			(data.effectiveDate !== undefined || data.isActive !== undefined)
		) {
			await this.assertNoConflictingActiveRate(
				exchangeRate.fromCurrencyId,
				exchangeRate.toCurrencyId,
				nextEffectiveDate,
				id
			)
		}

		// Note: this project's DB dialect is MySQL, which does not support
		// `RETURNING`. Updating the already-fetched instance directly avoids
		// relying on it — see the identical note in
		// `RateCardService.updateRateCard`/`CurrencyService.updateCurrency`.
		const updated = await sequelize.transaction(async (transaction) => {
			return exchangeRate.update(
				{
					...(data.rate !== undefined && { rate: data.rate.toFixed(6) }),
					...(data.effectiveDate !== undefined && {
						effectiveDate: data.effectiveDate,
					}),
					...(data.isActive !== undefined && { isActive: data.isActive }),
				},
				{ transaction }
			)
		})

		return this.buildResponseDTO(updated, fromCurrency, toCurrency)
	}

	public async deleteExchangeRate(id: number): Promise<boolean> {
		const exchangeRate = await this.exchangeRateRepository.findByPk(id)
		if (!exchangeRate) {
			return false
		}

		// Note: no `InvoiceLineItem`/`Invoice` model exists yet in this
		// codebase (Module 6), so there is no "referenced by invoices" guard
		// to check before soft-deleting — same caveat as
		// `RateCardService.deleteRateCard`/`CurrencyService.deleteCurrency`.
		// Revisit once that association lands.
		const deletedCount = await this.exchangeRateRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}

	public async getLatestExchangeRate(
		options: ExchangeRateLookupOptions
	): Promise<ExchangeRateResponseDTO> {
		const { fromCurrencyId, toCurrencyId } = options

		const fromCurrency = await this.currencyRepository.findByPk(fromCurrencyId)
		if (!fromCurrency) {
			throw new AppException('From currency not found', 404)
		}

		const toCurrency = await this.currencyRepository.findByPk(toCurrencyId)
		if (!toCurrency) {
			throw new AppException('To currency not found', 404)
		}

		// The API spec's `GetLatestExchangeRate` takes no `asOfDate` param —
		// "latest" always means as of today (server date), same "default to
		// today when omitted" convention as `RateCardService.lookupRateCard`.
		const asOfDate = new Date().toISOString().slice(0, 10)

		const exchangeRate = await this.exchangeRateRepository.findLatestActiveRate(
			fromCurrencyId,
			toCurrencyId,
			asOfDate
		)
		if (!exchangeRate) {
			throw new AppException(
				'No active exchange rate found for this currency pair',
				404
			)
		}

		return this.buildResponseDTO(exchangeRate, fromCurrency, toCurrency)
	}
}
