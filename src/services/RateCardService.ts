import { injectable, inject } from 'inversify'
import { WhereOptions, Op, UniqueConstraintError } from 'sequelize'
import { IRateCardService } from '../interfaces/service/IRateCardService'
import { IRateCardRepository } from '../interfaces/repository/IRateCardRepository'
import { ICountryRepository } from '../interfaces/repository/ICountryRepository'
import { IResourceRoleTypeRepository } from '../interfaces/repository/IResourceRoleTypeRepository'
import { ICurrencyRepository } from '../interfaces/repository/ICurrencyRepository'
import { RateCard } from '../models/RateCard'
import { Country } from '../models/Country'
import { ResourceRoleType } from '../models/ResourceRoleType'
import { Currency } from '../models/Currency'
import { sequelize } from '../models'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import { PaginationResult } from '../utils/Paginator'
import {
	CreateRateCardDTO,
	RateCardFilterOptions,
	RateCardLookupOptions,
	RateCardResponseDTO,
	UpdateRateCardDTO,
} from '../types/rateCardTypes'

const RATE_CARD_INCLUDE = [
	{ model: Country, as: 'country', attributes: ['id', 'code', 'name'] },
	{
		model: ResourceRoleType,
		as: 'resourceRoleType',
		attributes: ['id', 'name'],
	},
	{ model: Currency, as: 'currency', attributes: ['id', 'code', 'symbol'] },
]

@injectable()
export class RateCardService implements IRateCardService {
	private static readonly ACTIVE_CONFLICT_MESSAGE =
		'An active rate card already exists for this country, resource role type, and effective date'

	constructor(
		@inject(TYPES.IRateCardRepository)
		private rateCardRepository: IRateCardRepository,
		@inject(TYPES.ICountryRepository)
		private countryRepository: ICountryRepository,
		@inject(TYPES.IResourceRoleTypeRepository)
		private resourceRoleTypeRepository: IResourceRoleTypeRepository,
		@inject(TYPES.ICurrencyRepository)
		private currencyRepository: ICurrencyRepository
	) {}

	private buildResponseDTO(
		rateCard: RateCard,
		country: Country,
		resourceRoleType: ResourceRoleType,
		currency: Currency
	): RateCardResponseDTO {
		return {
			id: rateCard.id,
			country: { id: country.id, code: country.code, name: country.name },
			resourceRoleType: {
				id: resourceRoleType.id,
				name: resourceRoleType.name,
			},
			currency: {
				id: currency.id,
				code: currency.code,
				symbol: currency.symbol,
			},
			// `billingRate` (DECIMAL) is returned as a string by Sequelize — see
			// the note in `src/models/RateCard.ts`.
			hourlyRate: Number(rateCard.billingRate),
			effectiveDate: rateCard.effectiveDate,
			isActive: rateCard.isActive,
		}
	}

	/** Associations are only guaranteed present when the query that produced
	 * `rateCard` requested them via `include` (`RATE_CARD_INCLUDE`, used by
	 * `getAllRateCards`/`getRateCardById`/`lookupRateCard` below) — guarded
	 * rather than asserted so a future call site that forgets the `include`
	 * fails loudly instead of serializing `undefined` (same convention as
	 * `TimesheetEntryService.toDetailDTO`). */
	private toResponseDTO(rateCard: RateCard): RateCardResponseDTO {
		const { country, resourceRoleType, currency } = rateCard
		if (!country || !resourceRoleType || !currency) {
			throw new AppException('Failed to load rate card details', 500)
		}
		return this.buildResponseDTO(rateCard, country, resourceRoleType, currency)
	}

	/**
	 * Mirrors the DB's `rate_cards_active_country_role_effective_uidx` unique
	 * index (generated `active_rate_card_marker` column — see the `rate_cards`
	 * migration) at the application layer, so attempting to create/reactivate
	 * a second active rate card for the same country + role type + effective
	 * date fails with a clean 409 rather than a raw DB unique-constraint
	 * error. The DB index remains the authoritative backstop (e.g. for
	 * concurrent requests racing this check).
	 */
	private async assertNoConflictingActiveRateCard(
		countryId: number,
		resourceRoleTypeId: number,
		effectiveDate: string,
		excludeId?: number
	): Promise<void> {
		const conflict =
			await this.rateCardRepository.findActiveByCountryRoleAndEffectiveDate(
				countryId,
				resourceRoleTypeId,
				effectiveDate,
				excludeId
			)

		if (conflict) {
			throw new AppException(RateCardService.ACTIVE_CONFLICT_MESSAGE, 409)
		}
	}

	/**
	 * Maps the DB-level `rate_cards_active_country_role_effective_uidx`
	 * unique-constraint violation (the authoritative backstop for
	 * `assertNoConflictingActiveRateCard` above) to the same clean 409
	 * `AppException`. Closes the check-then-act race window between the
	 * application-level pre-check and the write: two concurrent requests can
	 * both pass the pre-check, but only one `create`/`update` will succeed —
	 * the loser now gets a well-formed 409 instead of an unhandled 500 from a
	 * raw Sequelize `UniqueConstraintError`.
	 */
	private rethrowAsConflictIfUniqueConstraint(error: unknown): never {
		if (error instanceof UniqueConstraintError) {
			throw new AppException(RateCardService.ACTIVE_CONFLICT_MESSAGE, 409)
		}
		throw error
	}

	public async getAllRateCards(
		options: RateCardFilterOptions
	): Promise<PaginationResult<RateCardResponseDTO>> {
		const {
			countryId,
			resourceRoleTypeId,
			currencyId,
			isActive,
			effectiveDate,
			page,
			perPage,
		} = options

		const whereClause: WhereOptions = {
			...(countryId !== undefined && { countryId }),
			...(resourceRoleTypeId !== undefined && { resourceRoleTypeId }),
			...(currencyId !== undefined && { currencyId }),
			...(isActive !== undefined && { isActive }),
			...(effectiveDate !== undefined && {
				effectiveDate: { [Op.lte]: effectiveDate },
			}),
		}

		const paginated = await this.rateCardRepository.findAndPaginate(
			page,
			perPage,
			{
				where: whereClause,
				include: RATE_CARD_INCLUDE,
				order: [
					['effectiveDate', 'DESC'],
					['id', 'DESC'],
				],
			}
		)

		return {
			...paginated,
			data: paginated.data.map((rateCard) => this.toResponseDTO(rateCard)),
		}
	}

	public async getRateCardById(id: number): Promise<RateCardResponseDTO> {
		const rateCard = await this.rateCardRepository.findByPk(id, {
			include: RATE_CARD_INCLUDE,
		})

		if (!rateCard) {
			throw new AppException('Rate card not found', 404)
		}

		return this.toResponseDTO(rateCard)
	}

	public async createRateCard(
		data: CreateRateCardDTO
	): Promise<RateCardResponseDTO> {
		const { countryId, resourceRoleTypeId, currencyId, effectiveDate } = data
		const isActive = data.isActive ?? true

		const country = await this.countryRepository.findByPk(countryId)
		if (!country) {
			throw new AppException('Country not found', 404)
		}

		const resourceRoleType =
			await this.resourceRoleTypeRepository.findByPk(resourceRoleTypeId)
		if (!resourceRoleType) {
			throw new AppException('Resource role type not found', 404)
		}

		const currency = await this.currencyRepository.findByPk(currencyId)
		if (!currency) {
			throw new AppException('Currency not found', 404)
		}

		// Application-level pre-check for the common case; see
		// `assertNoConflictingActiveRateCard`'s doc-comment for the DB-level
		// backstop. An inactive card never conflicts, so this only runs when
		// the card being created would actually be active.
		if (isActive) {
			await this.assertNoConflictingActiveRateCard(
				countryId,
				resourceRoleTypeId,
				effectiveDate
			)
		}

		// `costRate` is not part of the documented `CreateRateCard` request
		// body — see `CreateRateCardDTO`'s doc-comment. Defaulting it to
		// `hourlyRate` (zero margin) keeps the NOT NULL DB column satisfied
		// until product confirms how it should be supplied.
		const costRate = data.costRate ?? data.hourlyRate

		const rateCard = await sequelize.transaction(async (transaction) => {
			try {
				return await this.rateCardRepository.create(
					{
						countryId,
						resourceRoleTypeId,
						currencyId,
						billingRate: data.hourlyRate.toFixed(2),
						costRate: costRate.toFixed(2),
						effectiveDate,
						isActive,
					},
					{ transaction }
				)
			} catch (error) {
				this.rethrowAsConflictIfUniqueConstraint(error)
			}
		})

		if (!rateCard) {
			throw new AppException('Failed to create rate card', 500)
		}

		return this.buildResponseDTO(
			rateCard,
			country,
			resourceRoleType,
			currency
		)
	}

	public async updateRateCard(
		id: number,
		data: UpdateRateCardDTO
	): Promise<RateCardResponseDTO | null> {
		const rateCard = await this.rateCardRepository.findByPk(id, {
			include: RATE_CARD_INCLUDE,
		})
		if (!rateCard) {
			return null
		}

		const { country, resourceRoleType, currency: currentCurrency } = rateCard
		if (!country || !resourceRoleType || !currentCurrency) {
			throw new AppException('Failed to load rate card details', 500)
		}

		let currency = currentCurrency
		if (data.currencyId !== undefined && data.currencyId !== rateCard.currencyId) {
			const nextCurrency = await this.currencyRepository.findByPk(
				data.currencyId
			)
			if (!nextCurrency) {
				throw new AppException('Currency not found', 404)
			}
			currency = nextCurrency
		}

		const nextEffectiveDate = data.effectiveDate ?? rateCard.effectiveDate
		const nextIsActive = data.isActive ?? rateCard.isActive

		// Re-validate the uniqueness rule whenever the row would end up active
		// for a (possibly new) effective date — covers reactivating a card or
		// moving its effective date. `countryId`/`resourceRoleTypeId` are
		// immutable via this endpoint (see `UpdateRateCardDTO`), so only
		// `effectiveDate`/`isActive` changes can introduce a new conflict.
		if (
			nextIsActive &&
			(data.effectiveDate !== undefined || data.isActive !== undefined)
		) {
			await this.assertNoConflictingActiveRateCard(
				rateCard.countryId,
				rateCard.resourceRoleTypeId,
				nextEffectiveDate,
				id
			)
		}

		// Note: this project's DB dialect is MySQL, which does not support
		// `RETURNING`. Updating the already-fetched instance directly avoids
		// relying on it — see the identical note in `CurrencyService.updateCurrency`.
		const updated = await sequelize.transaction(async (transaction) => {
			try {
				return await rateCard.update(
					{
						...(data.hourlyRate !== undefined && {
							billingRate: data.hourlyRate.toFixed(2),
						}),
						...(data.costRate !== undefined && {
							costRate: data.costRate.toFixed(2),
						}),
						...(data.effectiveDate !== undefined && {
							effectiveDate: data.effectiveDate,
						}),
						...(data.isActive !== undefined && { isActive: data.isActive }),
						...(data.currencyId !== undefined && {
							currencyId: data.currencyId,
						}),
					},
					{ transaction }
				)
			} catch (error) {
				this.rethrowAsConflictIfUniqueConstraint(error)
			}
		})

		return this.buildResponseDTO(updated, country, resourceRoleType, currency)
	}

	public async deleteRateCard(id: number): Promise<boolean> {
		const rateCard = await this.rateCardRepository.findByPk(id)
		if (!rateCard) {
			return false
		}

		// Note: no `InvoiceLineItem`/`Invoice` model exists yet in this
		// codebase (Module 6), so there is no "referenced by invoices" guard
		// to check before soft-deleting — same caveat as
		// `CurrencyService.deleteCurrency` / `TimesheetPeriodService.deleteTimesheetPeriod`.
		// Revisit once that association lands.
		const deletedCount = await this.rateCardRepository.delete({
			where: { id },
		})
		return deletedCount > 0
	}

	public async lookupRateCard(
		options: RateCardLookupOptions
	): Promise<RateCardResponseDTO> {
		const { countryId, resourceRoleTypeId } = options
		const asOfDate = options.asOfDate ?? new Date().toISOString().slice(0, 10)

		const country = await this.countryRepository.findByPk(countryId)
		if (!country) {
			throw new AppException('Country not found', 404)
		}

		const resourceRoleType =
			await this.resourceRoleTypeRepository.findByPk(resourceRoleTypeId)
		if (!resourceRoleType) {
			throw new AppException('Resource role type not found', 404)
		}

		const rateCard = await this.rateCardRepository.findEffectiveRateCard(
			countryId,
			resourceRoleTypeId,
			asOfDate
		)
		if (!rateCard) {
			throw new AppException(
				'No effective rate card found for this country and resource role type',
				404
			)
		}

		const currency = await this.currencyRepository.findByPk(
			rateCard.currencyId
		)
		if (!currency) {
			throw new AppException('Failed to load rate card details', 500)
		}

		return this.buildResponseDTO(
			rateCard,
			country,
			resourceRoleType,
			currency
		)
	}
}
