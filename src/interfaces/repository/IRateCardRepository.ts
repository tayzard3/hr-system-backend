import { RateCard } from '../../models/RateCard'
import { IBaseRepository } from './IBaseRepository'

export interface IRateCardRepository extends IBaseRepository<RateCard> {
	/**
	 * Returns the currently active, non-deleted rate card for a given
	 * country + role type + effective date, if any, optionally excluding a
	 * given id (used when updating that same rate card). Backs the
	 * application-level guard that mirrors the DB's
	 * `rate_cards_active_country_role_effective_uidx` unique index (see the
	 * `rate_cards` migration) so a conflict surfaces as a clean 409 instead
	 * of a raw unique-constraint DB error.
	 */
	findActiveByCountryRoleAndEffectiveDate(
		countryId: number,
		resourceRoleTypeId: number,
		effectiveDate: string,
		excludeId?: number
	): Promise<RateCard | null>

	/**
	 * Returns the currently effective rate card for a country + role type as
	 * of a given date — i.e. the most recent active, non-deleted rate card
	 * whose `effectiveDate` is on or before `asOfDate`. Backs
	 * `RateCardService.lookupRateCard`.
	 */
	findEffectiveRateCard(
		countryId: number,
		resourceRoleTypeId: number,
		asOfDate: string
	): Promise<RateCard | null>
}
