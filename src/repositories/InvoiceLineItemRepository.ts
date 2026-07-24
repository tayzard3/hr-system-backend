import { injectable } from 'inversify'
import { type Attributes, type DestroyOptions } from 'sequelize'
import { InvoiceLineItem } from '../models/InvoiceLineItem'
import { IInvoiceLineItemRepository } from '../interfaces/repository/IInvoiceLineItemRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class InvoiceLineItemRepository
	extends BaseRepository<InvoiceLineItem>
	implements IInvoiceLineItemRepository
{
	constructor() {
		super(InvoiceLineItem)
	}

	public async deleteByInvoiceId(
		invoiceId: number,
		options?: Omit<DestroyOptions<Attributes<InvoiceLineItem>>, 'where'>
	): Promise<number> {
		return this.model.destroy({ where: { invoiceId }, ...options })
	}
}
