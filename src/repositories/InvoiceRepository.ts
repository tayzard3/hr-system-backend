import { injectable } from 'inversify'
import {
	Op,
	type Attributes,
	type CreateOptions,
	type CreationAttributes,
} from 'sequelize'
import { Invoice } from '../models/Invoice'
import { IInvoiceRepository } from '../interfaces/repository/IInvoiceRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class InvoiceRepository
	extends BaseRepository<Invoice>
	implements IInvoiceRepository
{
	constructor() {
		super(Invoice)
	}

	/**
	 * Overrides `BaseRepository.create`, which catches every Sequelize error
	 * and rewraps it as a plain `new Error(...)`, losing the original error's
	 * type identity before it can reach
	 * `InvoiceService.rethrowAsConflictIfUniqueConstraint` — same reasoning as
	 * `RateCardRepository.create`'s override.
	 */
	public async create(
		data: CreationAttributes<Invoice>,
		options?: CreateOptions<Attributes<Invoice>>
	): Promise<Invoice | undefined> {
		return this.model.create(data, options)
	}

	public async findActiveByProjectAndBillingPeriod(
		projectId: number,
		billingPeriodStart: string,
		billingPeriodEnd: string,
		excludeId?: number
	): Promise<Invoice | null> {
		return this.model.findOne({
			where: {
				projectId,
				billingPeriodStart,
				billingPeriodEnd,
				...(excludeId !== undefined && { id: { [Op.ne]: excludeId } }),
			},
		})
	}

	public async countByInvoiceNumberPrefix(prefix: string): Promise<number> {
		return this.model.count({
			where: { invoiceNumber: { [Op.like]: `${prefix}%` } },
			paranoid: false,
		})
	}
}
