import { PaginationResult } from '../../utils/Paginator'
import {
	CreateRateCardDTO,
	RateCardFilterOptions,
	RateCardLookupOptions,
	RateCardResponseDTO,
	UpdateRateCardDTO,
} from '../../types/rateCardTypes'

export interface IRateCardService {
	getAllRateCards(
		options: RateCardFilterOptions
	): Promise<PaginationResult<RateCardResponseDTO>>
	getRateCardById(id: number): Promise<RateCardResponseDTO>
	createRateCard(data: CreateRateCardDTO): Promise<RateCardResponseDTO>
	updateRateCard(
		id: number,
		data: UpdateRateCardDTO
	): Promise<RateCardResponseDTO | null>
	deleteRateCard(id: number): Promise<boolean>
	lookupRateCard(
		options: RateCardLookupOptions
	): Promise<RateCardResponseDTO>
}
