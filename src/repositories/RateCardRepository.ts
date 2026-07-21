import { injectable } from 'inversify'
import { Op } from 'sequelize'
import { RateCard } from '../models/RateCard'
import { IRateCardRepository } from '../interfaces/repository/IRateCardRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class RateCardRepository
	extends BaseRepository<RateCard>
	implements IRateCardRepository
{
	constructor() {
		super(RateCard)
	}

	public async findActiveByCountryRoleAndEffectiveDate(
		countryId: number,
		resourceRoleTypeId: number,
		effectiveDate: string,
		excludeId?: number
	): Promise<RateCard | null> {
		return this.model.findOne({
			where: {
				countryId,
				resourceRoleTypeId,
				effectiveDate,
				isActive: true,
				...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }),
			},
		})
	}

	public async findEffectiveRateCard(
		countryId: number,
		resourceRoleTypeId: number,
		asOfDate: string
	): Promise<RateCard | null> {
		return this.model.findOne({
			where: {
				countryId,
				resourceRoleTypeId,
				isActive: true,
				effectiveDate: { [Op.lte]: asOfDate },
			},
			order: [['effectiveDate', 'DESC']],
		})
	}
}
