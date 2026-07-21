import { Currency } from '../../models/Currency'
import { IBaseRepository } from './IBaseRepository'

export interface ICurrencyRepository extends IBaseRepository<Currency> {
	findByCode(code: string): Promise<Currency | null>

	/**
	 * Returns the currently non-deleted currency flagged as the base currency,
	 * if any, optionally excluding a given id (used when updating that same
	 * currency). Backs the application-level guard that mirrors the DB's
	 * `currencies_active_base_currency_uidx` unique index (see the Currency
	 * migration) so a conflict surfaces as a clean 409 instead of a raw
	 * unique-constraint DB error.
	 */
	findActiveBaseCurrency(excludeId?: number): Promise<Currency | null>
}
