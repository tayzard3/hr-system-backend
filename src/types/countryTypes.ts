export interface CountryFilterOptions {
	page: number
	perPage?: number | undefined
	keyword?: string | undefined
}

export interface CreateCountryDTO {
	code: string
	name: string
}

export interface UpdateCountryDTO {
	code?: string
	name?: string
}
