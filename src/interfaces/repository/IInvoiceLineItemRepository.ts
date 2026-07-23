import { DestroyOptions, Attributes } from 'sequelize'
import { InvoiceLineItem } from '../../models/InvoiceLineItem'
import { IBaseRepository } from './IBaseRepository'

export interface IInvoiceLineItemRepository
	extends IBaseRepository<InvoiceLineItem> {
	/**
	 * Hard-deletes every line item belonging to an invoice. `InvoiceLineItem`
	 * has no `deletedAt` of its own (see the model's doc-comment) — it is
	 * owned entirely by its parent `Invoice`, so `InvoiceService.deleteInvoice`
	 * (Draft-only) must explicitly remove the rows itself before soft-deleting
	 * the invoice, freeing up `invoice_line_items_timesheet_entry_id_uidx` for
	 * the source timesheet entries to be invoiced again.
	 */
	deleteByInvoiceId(
		invoiceId: number,
		options?: Omit<DestroyOptions<Attributes<InvoiceLineItem>>, 'where'>
	): Promise<number>
}
