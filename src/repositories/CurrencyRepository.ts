import { injectable } from 'inversify'
import { Op } from 'sequelize'
import { Currency } from '../models/Currency'
import { ICurrencyRepository } from '../interfaces/repository/ICurrencyRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class CurrencyRepository
	extends BaseRepository<Currency>
	implements ICurrencyRepository
{
	constructor() {
		super(Currency)
	}

	public async findByCode(code: string): Promise<Currency | null> {
		return this.model.findOne({ where: { code } })
	}

	public async findActiveBaseCurrency(
		excludeId?: number
	): Promise<Currency | null> {
		return this.model.findOne({
			where: {
				isBaseCurrency: true,
				...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }),
			},
		})
	}
}
