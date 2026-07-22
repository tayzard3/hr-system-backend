import { injectable } from 'inversify'
import { Op } from 'sequelize'
import { ExchangeRate } from '../models/ExchangeRate'
import { IExchangeRateRepository } from '../interfaces/repository/IExchangeRateRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class ExchangeRateRepository
	extends BaseRepository<ExchangeRate>
	implements IExchangeRateRepository
{
	constructor() {
		super(ExchangeRate)
	}

	public async findActiveByPairAndEffectiveDate(
		fromCurrencyId: number,
		toCurrencyId: number,
		effectiveDate: string,
		excludeId?: number
	): Promise<ExchangeRate | null> {
		return this.model.findOne({
			where: {
				fromCurrencyId,
				toCurrencyId,
				effectiveDate,
				isActive: true,
				...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }),
			},
		})
	}

	public async findLatestActiveRate(
		fromCurrencyId: number,
		toCurrencyId: number,
		asOfDate: string
	): Promise<ExchangeRate | null> {
		return this.model.findOne({
			where: {
				fromCurrencyId,
				toCurrencyId,
				isActive: true,
				effectiveDate: { [Op.lte]: asOfDate },
			},
			order: [['effectiveDate', 'DESC']],
		})
	}
}
