export interface RateCardCountrySummaryDTO {
	id: number
	code: string
	name: string
}

export interface RateCardResourceRoleTypeSummaryDTO {
	id: number
	name: string
}

export interface RateCardCurrencySummaryDTO {
	id: number
	code: string
	symbol: string
}

/**
 * API-facing shape of a rate card. `hourlyRate` is the API spec's name for
 * the `billing_rate` column (client-facing hourly billing rate) — see
 * `src/models/RateCard.ts`. The internal `cost_rate` column is intentionally
 * not exposed here: the API spec's `GetAllRateCards`/`GetRateCardById`
 * response examples only document `hourlyRate`.
 */
export interface RateCardResponseDTO {
	id: number
	country: RateCardCountrySummaryDTO
	resourceRoleType: RateCardResourceRoleTypeSummaryDTO
	currency: RateCardCurrencySummaryDTO
	hourlyRate: number
	effectiveDate: string
	isActive: boolean
}

/**
 * `costRate` is NOT part of the documented `CreateRateCard` request body in
 * the API spec (which only defines `hourlyRate`), but the DB schema's
 * `cost_rate` column is `NOT NULL`. Kept optional here, additive to the
 * documented contract, so a future/internal client can supply it once
 * product confirms how it should flow in; `RateCardService.createRateCard`
 * defaults it to `hourlyRate` (i.e. zero margin) when omitted. Flagged as an
 * assumption requiring business sign-off — see the accompanying report.
 */
export interface CreateRateCardDTO {
	countryId: number
	resourceRoleTypeId: number
	currencyId: number
	hourlyRate: number
	effectiveDate: string
	isActive?: boolean
	costRate?: number
}

/**
 * Mirrors the API spec's `UpdateRateCard` body (`hourlyRate`,
 * `effectiveDate`, `isActive`, `currencyId`) — `countryId`/
 * `resourceRoleTypeId` are immutable after creation, matching the DB's
 * uniqueness rule being scoped to (country, role type, effective date).
 * `costRate` — see the same caveat as `CreateRateCardDTO`.
 */
export interface UpdateRateCardDTO {
	hourlyRate?: number
	effectiveDate?: string
	isActive?: boolean
	currencyId?: number
	costRate?: number
}

export interface RateCardFilterOptions {
	countryId?: number
	resourceRoleTypeId?: number
	currencyId?: number
	isActive?: boolean
	/** "Cards active on or before this date" per the API spec — matched as
	 * `effective_date <= effectiveDate`. */
	effectiveDate?: string
	page: number
	perPage: number
}

export interface RateCardLookupOptions {
	countryId: number
	resourceRoleTypeId: number
	/** Defaults to today (server date) when omitted, per the API spec. */
	asOfDate?: string
}
