import { Country } from '../../models/Country'
import {
	CountryFilterOptions,
	CreateCountryDTO,
	UpdateCountryDTO,
} from '../../types/countryTypes'
import { PaginationResult } from '../../utils/Paginator'

export interface ICountryService {
	createCountry(countryData: CreateCountryDTO): Promise<Country>
	updateCountry(
		id: number,
		countryData: UpdateCountryDTO
	): Promise<Country | null>
	deleteCountry(id: number): Promise<boolean>
	getCountryById(id: number): Promise<Country>
	getAllCountries(
		options: CountryFilterOptions
	): Promise<PaginationResult<Country> | Country[]>
}
