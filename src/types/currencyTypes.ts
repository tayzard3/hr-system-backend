export interface CurrencyFilterOptions {
	page: number
	perPage?: number
	/** Matches against `Currency.searchableFields` (code, name). */
	keyword?: string
	/** Backed by the `currencies_is_active_idx` index (see migration). */
	isActive?: boolean
}

export interface CreateCurrencyDTO {
	code: string
	name: string
	symbol: string
	isBaseCurrency?: boolean
}

export interface UpdateCurrencyDTO {
	code?: string
	name?: string
	symbol?: string
	isBaseCurrency?: boolean
	isActive?: boolean
}
