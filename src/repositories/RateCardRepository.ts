import { injectable } from 'inversify'
import { Op, type Attributes, type CreateOptions, type CreationAttributes } from 'sequelize'
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

	/**
	 * Overrides `BaseRepository.create`, which catches every Sequelize error
	 * and rewraps it as a plain `new Error(...)` (see `BaseRepository.create`).
	 * Since `UniqueConstraintError extends ValidationError`, that rewrap loses
	 * the original error's type/identity before it can reach
	 * `RateCardService.rethrowAsConflictIfUniqueConstraint`, which needs the
	 * real `UniqueConstraintError` to map the
	 * `rate_cards_active_country_role_effective_uidx` DB-level unique
	 * violation to a clean 409 — otherwise it surfaces as an unhandled 500
	 * with raw Sequelize error text leaking into the response body. Calling
	 * `this.model.create` directly here lets the original error propagate
	 * unchanged, matching how `updateRateCard` already gets it via
	 * `rateCard.update(...)`.
	 */
	public async create(
		data: CreationAttributes<RateCard>,
		options?: CreateOptions<Attributes<RateCard>>
	): Promise<RateCard | undefined> {
		return this.model.create(data, options)
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
