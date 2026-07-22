import { ExchangeRate } from '../../models/ExchangeRate'
import { IBaseRepository } from './IBaseRepository'

export interface IExchangeRateRepository extends IBaseRepository<ExchangeRate> {
	/**
	 * Returns the currently active, non-deleted exchange rate for a given
	 * from/to currency pair + effective date, if any, optionally excluding a
	 * given id (used when updating that same exchange rate). Backs the
	 * application-level guard that mirrors the DB's
	 * `exchange_rates_active_pair_effective_uidx` unique index (see the
	 * `exchange_rates` migration) so a conflict surfaces as a clean 409
	 * instead of a raw unique-constraint DB error.
	 */
	findActiveByPairAndEffectiveDate(
		fromCurrencyId: number,
		toCurrencyId: number,
		effectiveDate: string,
		excludeId?: number
	): Promise<ExchangeRate | null>

	/**
	 * Returns the latest effective active, non-deleted exchange rate for a
	 * from/to currency pair as of a given date — i.e. the active exchange
	 * rate with the most recent `effectiveDate` that is on or before
	 * `asOfDate`. Backs `ExchangeRateService.getLatestExchangeRate`.
	 */
	findLatestActiveRate(
		fromCurrencyId: number,
		toCurrencyId: number,
		asOfDate: string
	): Promise<ExchangeRate | null>
}
