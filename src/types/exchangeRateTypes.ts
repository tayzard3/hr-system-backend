export interface ExchangeRateCurrencySummaryDTO {
	id: number
	code: string
	symbol: string
}

/**
 * API-facing shape of an exchange rate — mirrors the API spec's
 * `GetAllExchangeRates`/`GetExchangeRateById`/`GetLatestExchangeRate`
 * response examples. `rate` (DECIMAL) is returned as a string by Sequelize —
 * see the note in `src/models/ExchangeRate.ts` — and is converted to a
 * `number` here, same convention as `RateCardResponseDTO.hourlyRate`.
 */
export interface ExchangeRateResponseDTO {
	id: number
	fromCurrency: ExchangeRateCurrencySummaryDTO
	toCurrency: ExchangeRateCurrencySummaryDTO
	rate: number
	effectiveDate: string
	isActive: boolean
	createdAt: Date
}

export interface CreateExchangeRateDTO {
	fromCurrencyId: number
	toCurrencyId: number
	rate: number
	effectiveDate: string
	isActive?: boolean
}

/**
 * Mirrors the API spec's `UpdateExchangeRate` body (`rate`, `effectiveDate`,
 * `isActive`) — `fromCurrencyId`/`toCurrencyId` are immutable after creation,
 * matching the DB's uniqueness rule being scoped to (from currency, to
 * currency, effective date).
 */
export interface UpdateExchangeRateDTO {
	rate?: number
	effectiveDate?: string
	isActive?: boolean
}

export interface ExchangeRateFilterOptions {
	fromCurrencyId?: number
	toCurrencyId?: number
	isActive?: boolean
	/** "Rates effective on or before this date" per the API spec — matched
	 * as `effective_date <= effectiveDate`. */
	effectiveDate?: string
	page: number
	perPage: number
}

export interface ExchangeRateLookupOptions {
	fromCurrencyId: number
	toCurrencyId: number
}
