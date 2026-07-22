import { PaginationResult } from '../../utils/Paginator'
import {
	CreateExchangeRateDTO,
	ExchangeRateFilterOptions,
	ExchangeRateLookupOptions,
	ExchangeRateResponseDTO,
	UpdateExchangeRateDTO,
} from '../../types/exchangeRateTypes'

export interface IExchangeRateService {
	getAllExchangeRates(
		options: ExchangeRateFilterOptions
	): Promise<PaginationResult<ExchangeRateResponseDTO>>
	getExchangeRateById(id: number): Promise<ExchangeRateResponseDTO>
	createExchangeRate(
		data: CreateExchangeRateDTO
	): Promise<ExchangeRateResponseDTO>
	updateExchangeRate(
		id: number,
		data: UpdateExchangeRateDTO
	): Promise<ExchangeRateResponseDTO | null>
	deleteExchangeRate(id: number): Promise<boolean>
	getLatestExchangeRate(
		options: ExchangeRateLookupOptions
	): Promise<ExchangeRateResponseDTO>
}
