import { Invoice } from '../../models/Invoice'
import { IBaseRepository } from './IBaseRepository'

export interface IInvoiceRepository extends IBaseRepository<Invoice> {
	/**
	 * Returns the currently non-deleted invoice for an exact
	 * (project, billingPeriodStart, billingPeriodEnd) triple, if any,
	 * optionally excluding a given id. Backs the application-level guard that
	 * mirrors the DB's `invoices_active_project_billing_period_uidx` unique
	 * index (see the `invoices` migration) so a duplicate-period conflict
	 * surfaces as a clean 409 instead of a raw unique-constraint DB error.
	 * Note this only catches an *exact* duplicate period, not a merely
	 * overlapping one — see the migration's note on
	 * `invoices_project_billing_period_idx`.
	 */
	findActiveByProjectAndBillingPeriod(
		projectId: number,
		billingPeriodStart: string,
		billingPeriodEnd: string,
		excludeId?: number
	): Promise<Invoice | null>

	/**
	 * Counts invoices (including soft-deleted ones) whose `invoiceNumber`
	 * starts with the given prefix — backs `InvoiceService`'s sequential
	 * `INV-{year}-{seq}` number generation. Soft-deleted rows must be
	 * included: unlike `rate_cards`/`exchange_rates`/`currencies`/`invoices`
	 * (whose *active* uniqueness is enforced via a generated marker column),
	 * `invoices.invoice_number` is a plain, unconditional unique constraint
	 * that still applies to soft-deleted rows, so a soft-deleted invoice's
	 * number must never be reissued.
	 */
	countByInvoiceNumberPrefix(prefix: string): Promise<number>
}
