import { Currency } from '../../models/Currency'
import {
	CreateCurrencyDTO,
	CurrencyFilterOptions,
	UpdateCurrencyDTO,
} from '../../types/currencyTypes'
import { PaginationResult } from '../../utils/Paginator'

export interface ICurrencyService {
	createCurrency(currencyData: CreateCurrencyDTO): Promise<Currency>
	updateCurrency(
		id: number,
		currencyData: UpdateCurrencyDTO
	): Promise<Currency | null>
	deleteCurrency(id: number): Promise<boolean>
	getCurrencyById(id: number): Promise<Currency>
	getAllCurrencies(
		options: CurrencyFilterOptions
	): Promise<PaginationResult<Currency> | Currency[]>
}
