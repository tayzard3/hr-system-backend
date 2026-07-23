import { Op, Transaction } from 'sequelize'
import { IInvoiceRepository } from '../../interfaces/repository/IInvoiceRepository'
import { IInvoiceLineItemRepository } from '../../interfaces/repository/IInvoiceLineItemRepository'
import { IProjectRepository } from '../../interfaces/repository/IProjectRepository'
import { ICurrencyRepository } from '../../interfaces/repository/ICurrencyRepository'
import { ITimesheetEntryRepository } from '../../interfaces/repository/ITimesheetEntryRepository'
import { IProjectResourceAssignmentRepository } from '../../interfaces/repository/IProjectResourceAssignmentRepository'
import { IRateCardRepository } from '../../interfaces/repository/IRateCardRepository'
import { IExchangeRateRepository } from '../../interfaces/repository/IExchangeRateRepository'

// InvoiceService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)`. Mock the whole models module so unit tests never touch
// a real DB connection (same convention as TimesheetEntryService.test.ts).
const transactionMock = jest.fn(
	async (cb: (t: Transaction) => Promise<unknown>) =>
		cb({} as unknown as Transaction)
)

jest.mock('../../models', () => ({
	sequelize: {
		transaction: (cb: (t: Transaction) => Promise<unknown>) =>
			transactionMock(cb),
	},
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { InvoiceService } from '../InvoiceService'

const makeMockRepository = <T extends object>(extra: Partial<T> = {}): jest.Mocked<T> =>
	({
		findByPk: jest.fn(),
		find: jest.fn(),
		findAndPaginate: jest.fn(),
		findOne: jest.fn(),
		findOrCreate: jest.fn(),
		delete: jest.fn(),
		update: jest.fn(),
		create: jest.fn(),
		bulkCreate: jest.fn(),
		count: jest.fn(),
		upsert: jest.fn(),
		increasement: jest.fn(),
		decreasement: jest.fn(),
		query: jest.fn(),
		...extra,
	}) as unknown as jest.Mocked<T>

describe('InvoiceService', () => {
	let invoiceRepository: jest.Mocked<IInvoiceRepository>
	let invoiceLineItemRepository: jest.Mocked<IInvoiceLineItemRepository>
	let projectRepository: jest.Mocked<IProjectRepository>
	let currencyRepository: jest.Mocked<ICurrencyRepository>
	let timesheetEntryRepository: jest.Mocked<ITimesheetEntryRepository>
	let projectResourceAssignmentRepository: jest.Mocked<IProjectResourceAssignmentRepository>
	let rateCardRepository: jest.Mocked<IRateCardRepository>
	let exchangeRateRepository: jest.Mocked<IExchangeRateRepository>
	let invoiceService: InvoiceService

	const project = { id: 1, code: 'PRJ-1', name: 'Project One' }
	const sgd = { id: 1, code: 'SGD', symbol: 'S$', isBaseCurrency: true }
	const usd = { id: 2, code: 'USD', symbol: '$', isBaseCurrency: false }

	const generateDto = {
		projectId: project.id,
		billingPeriodStart: '2026-06-01',
		billingPeriodEnd: '2026-06-30',
		currencyId: sgd.id,
		clientName: 'Acme Corp',
		clientEmail: 'billing@acme.com',
		issuedDate: '2026-07-01',
		dueDate: '2026-07-31',
		notes: 'June services',
	}

	const user = { id: 5, name: 'John Doe', countryId: 10 }
	const assignment = { userId: 5, resourceRoleTypeId: 20, assignedAt: new Date('2026-01-01') }
	const rateCard = {
		countryId: 10,
		resourceRoleTypeId: 20,
		currencyId: sgd.id,
		billingRate: '150.00',
		effectiveDate: '2026-01-01',
		isActive: true,
	}
	const entry = {
		id: 100,
		userId: 5,
		projectId: project.id,
		entryDate: '2026-06-15',
		hours: '7.50',
		description: 'Implemented login flow',
		user,
	}

	const invoiceRow = (overrides: Record<string, unknown> = {}) => ({
		id: 50,
		invoiceNumber: 'INV-2026-0001',
		projectId: project.id,
		clientName: 'Acme Corp',
		clientEmail: 'billing@acme.com',
		billingPeriodStart: '2026-06-01',
		billingPeriodEnd: '2026-06-30',
		currencyId: sgd.id,
		exchangeRate: '1.000000',
		subTotal: '1125.00',
		taxAmount: '0.00',
		totalAmount: '1125.00',
		issuedDate: '2026-07-01',
		dueDate: '2026-07-31',
		notes: 'June services',
		status: 'Draft',
		createdAt: new Date('2026-07-01T00:00:00Z'),
		project,
		currency: sgd,
		...overrides,
	})

	beforeEach(() => {
		jest.clearAllMocks()

		invoiceRepository = makeMockRepository<IInvoiceRepository>({
			findActiveByProjectAndBillingPeriod: jest.fn(),
			countByInvoiceNumberPrefix: jest.fn(),
		})
		invoiceLineItemRepository = makeMockRepository<IInvoiceLineItemRepository>({
			deleteByInvoiceId: jest.fn(),
		})
		projectRepository = makeMockRepository<IProjectRepository>({
			findByCode: jest.fn(),
		})
		currencyRepository = makeMockRepository<ICurrencyRepository>({
			findByCode: jest.fn(),
			findActiveBaseCurrency: jest.fn(),
		})
		timesheetEntryRepository = makeMockRepository<ITimesheetEntryRepository>({
			findByUserProjectAndDate: jest.fn(),
			sumHoursGroupedByDate: jest.fn(),
		})
		projectResourceAssignmentRepository =
			makeMockRepository<IProjectResourceAssignmentRepository>({
				findActiveByProjectAndUser: jest.fn(),
			})
		rateCardRepository = makeMockRepository<IRateCardRepository>({
			findActiveByCountryRoleAndEffectiveDate: jest.fn(),
			findEffectiveRateCard: jest.fn(),
		})
		exchangeRateRepository = makeMockRepository<IExchangeRateRepository>({
			findActiveByPairAndEffectiveDate: jest.fn(),
			findLatestActiveRate: jest.fn(),
		})

		invoiceService = new InvoiceService(
			invoiceRepository,
			invoiceLineItemRepository,
			projectRepository,
			currencyRepository,
			timesheetEntryRepository,
			projectResourceAssignmentRepository,
			rateCardRepository,
			exchangeRateRepository
		)
	})

	describe('generateInvoice', () => {
		it('throws 404 when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 })
		})

		it('throws 404 when the currency does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({ message: 'Currency not found', statusCode: 404 })
		})

		it('throws 409 when an invoice already exists for the project and billing period', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(
				invoiceRow() as never
			)

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({ statusCode: 409 })
		})

		it('throws 400 when there are no eligible timesheet entries', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([])

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({
				message:
					'No approved, un-invoiced timesheet entries were found for this project and billing period',
				statusCode: 400,
			})
		})

		it('throws 500 when no active base currency is configured', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(null)

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({ statusCode: 500 })
		})

		it('throws 400 when no active exchange rate exists for a non-base target currency', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(usd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			exchangeRateRepository.findLatestActiveRate.mockResolvedValue(null)

			await expect(
				invoiceService.generateInvoice({ ...generateDto, currencyId: usd.id })
			).rejects.toMatchObject({
				message: 'No active exchange rate found from SGD to USD',
				statusCode: 400,
			})
		})

		it('throws 400 when the user has no resource assignment on the project', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			projectResourceAssignmentRepository.find.mockResolvedValue([])

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({
				message:
					'No project resource assignment found for user John Doe effective on 2026-06-15; cannot determine a billing rate',
				statusCode: 400,
			})
		})

		it('throws 400 when the user only has an assignment that starts after the entry date', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			// Assignment starts after the entry's date (2026-06-15) — not yet
			// effective on that date, so it must not be applied.
			projectResourceAssignmentRepository.find.mockResolvedValue([
				{ ...assignment, assignedAt: new Date('2026-07-01') },
			] as never)

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({
				message:
					'No project resource assignment found for user John Doe effective on 2026-06-15; cannot determine a billing rate',
				statusCode: 400,
			})
		})

		it('picks the assignment effective on the entry date when a user has changed role mid-period', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			// Two assignments for the same user: an older one (resourceRoleTypeId
			// 20) effective before the entry's date (2026-06-15), and a newer one
			// (resourceRoleTypeId 21) that only takes effect after it. The entry
			// must be billed under the OLDER role, not the user's current one.
			projectResourceAssignmentRepository.find.mockResolvedValue([
				{ ...assignment, resourceRoleTypeId: 21, assignedAt: new Date('2026-07-01') },
				{ ...assignment, resourceRoleTypeId: 20, assignedAt: new Date('2026-01-01') },
			] as never)
			rateCardRepository.find.mockResolvedValue([rateCard] as never)
			invoiceRepository.countByInvoiceNumberPrefix.mockResolvedValue(0)
			invoiceRepository.create.mockResolvedValue(invoiceRow() as never)
			invoiceLineItemRepository.bulkCreate.mockResolvedValue([] as never)
			timesheetEntryRepository.update.mockResolvedValue([1] as never)

			await invoiceService.generateInvoice(generateDto)

			expect(invoiceLineItemRepository.bulkCreate).toHaveBeenCalledWith(
				[expect.objectContaining({ resourceRoleTypeId: 20 })],
				expect.objectContaining({ transaction: expect.anything() })
			)
		})

		it('throws 400 when no effective rate card is found', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			projectResourceAssignmentRepository.find.mockResolvedValue([assignment] as never)
			rateCardRepository.find.mockResolvedValue([])

			await expect(
				invoiceService.generateInvoice(generateDto)
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('generates a draft invoice, materialises line items, and marks entries invoiced inside a transaction', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			invoiceRepository.findActiveByProjectAndBillingPeriod.mockResolvedValue(null)
			timesheetEntryRepository.find.mockResolvedValue([entry] as never)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			projectResourceAssignmentRepository.find.mockResolvedValue([assignment] as never)
			rateCardRepository.find.mockResolvedValue([rateCard] as never)
			invoiceRepository.countByInvoiceNumberPrefix.mockResolvedValue(0)
			invoiceRepository.create.mockResolvedValue(invoiceRow() as never)

			const result = await invoiceService.generateInvoice(generateDto)

			expect(transactionMock).toHaveBeenCalledTimes(1)
			expect(invoiceRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					invoiceNumber: 'INV-2026-0001',
					projectId: project.id,
					exchangeRate: '1.000000',
					subTotal: '1125.00',
					taxAmount: '0.00',
					totalAmount: '1125.00',
				}),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(invoiceLineItemRepository.bulkCreate).toHaveBeenCalledWith(
				[
					expect.objectContaining({
						invoiceId: 50,
						userId: user.id,
						resourceRoleTypeId: assignment.resourceRoleTypeId,
						timesheetEntryId: entry.id,
						hours: '7.50',
						unitRate: '150.00',
						amount: '1125.00',
					}),
				],
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(timesheetEntryRepository.update).toHaveBeenCalledWith(
				{ invoicedAt: expect.any(Date) },
				expect.objectContaining({
					where: { id: { [Op.in]: [entry.id] } },
					transaction: expect.anything(),
				})
			)
			expect(result).toMatchObject({
				id: 50,
				invoiceNumber: 'INV-2026-0001',
				projectId: project.id,
				projectName: project.name,
				subTotal: 1125,
				taxAmount: 0,
				totalAmount: 1125,
				status: 'Draft',
				lineItemCount: 1,
			})
		})
	})

	describe('getInvoiceById', () => {
		it('throws 404 when the invoice does not exist', async () => {
			invoiceRepository.findByPk.mockResolvedValue(null)

			await expect(invoiceService.getInvoiceById(999)).rejects.toMatchObject({
				message: 'Invoice not found',
				statusCode: 404,
			})
		})

		it('returns the mapped detail DTO including line items', async () => {
			const lineItem = {
				id: 1,
				timesheetEntryId: entry.id,
				description: entry.description,
				hours: '7.50',
				unitRate: '150.00',
				amount: '1125.00',
				user: { id: user.id, name: user.name },
				resourceRoleType: { id: 20, name: 'Senior Developer' },
			}
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ lineItems: [lineItem] }) as never
			)

			const result = await invoiceService.getInvoiceById(50)

			expect(result.lineItems).toEqual([
				{
					id: 1,
					user: { id: user.id, fullName: user.name },
					resourceRoleType: { id: 20, name: 'Senior Developer' },
					timesheetEntryId: entry.id,
					description: entry.description,
					hours: 7.5,
					unitRate: 150,
					amount: 1125,
				},
			])
			expect(result.currency).toEqual({ id: sgd.id, code: sgd.code, symbol: sgd.symbol })
		})
	})

	describe('updateInvoice', () => {
		it('returns null when the invoice does not exist', async () => {
			invoiceRepository.findByPk.mockResolvedValue(null)

			await expect(
				invoiceService.updateInvoice(999, { notes: 'x' })
			).resolves.toBeNull()
		})

		it('throws 400 when the invoice is not a Draft', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ status: 'Sent', lineItems: [] }) as never
			)

			await expect(
				invoiceService.updateInvoice(50, { notes: 'x' })
			).rejects.toMatchObject({
				message: 'Only Draft invoices can be updated',
				statusCode: 400,
			})
		})

		it('throws 400 when attempting to change the currency', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ lineItems: [] }) as never
			)

			await expect(
				invoiceService.updateInvoice(50, { currencyId: usd.id })
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('updates editable fields inside a transaction', async () => {
			const instance = {
				...invoiceRow({ lineItems: [{ id: 1 }] }),
				update: jest.fn().mockImplementation(function (
					this: Record<string, unknown>,
					data: Record<string, unknown>
				) {
					return { ...this, ...data }
				}),
			}
			invoiceRepository.findByPk.mockResolvedValue(instance as never)

			const result = await invoiceService.updateInvoice(50, {
				notes: 'Revised terms',
			})

			expect(instance.update).toHaveBeenCalledWith(
				{ notes: 'Revised terms' },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result?.lineItemCount).toBe(1)
		})
	})

	describe('deleteInvoice', () => {
		it('returns false when the invoice does not exist', async () => {
			invoiceRepository.findByPk.mockResolvedValue(null)

			await expect(invoiceService.deleteInvoice(999)).resolves.toBe(false)
		})

		it('throws 400 when the invoice is not a Draft', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ status: 'Sent', lineItems: [] }) as never
			)

			await expect(invoiceService.deleteInvoice(50)).rejects.toMatchObject({
				message: 'Only Draft invoices can be deleted',
				statusCode: 400,
			})
		})

		it('hard-deletes line items, frees the timesheet entries, and soft-deletes the invoice', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({
					lineItems: [{ id: 1, timesheetEntryId: entry.id }],
				}) as never
			)
			invoiceRepository.delete.mockResolvedValue(1)

			await expect(invoiceService.deleteInvoice(50)).resolves.toBe(true)

			expect(invoiceLineItemRepository.deleteByInvoiceId).toHaveBeenCalledWith(
				50,
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(timesheetEntryRepository.update).toHaveBeenCalledWith(
				{ invoicedAt: null },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(invoiceRepository.delete).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: 50 } })
			)
		})
	})

	describe('status transitions', () => {
		it('sendInvoice throws 400 when not Draft', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ status: 'Sent' }) as never
			)

			await expect(invoiceService.sendInvoice(50)).rejects.toMatchObject({
				statusCode: 400,
			})
		})

		it('sendInvoice transitions Draft -> Sent', async () => {
			const instance = {
				...invoiceRow(),
				update: jest.fn().mockImplementation(function (
					this: Record<string, unknown>,
					data: Record<string, unknown>
				) {
					return { ...this, ...data }
				}),
			}
			invoiceRepository.findByPk.mockResolvedValue(instance as never)

			const result = await invoiceService.sendInvoice(50)

			expect(instance.update).toHaveBeenCalledWith(
				{ status: 'Sent' },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual({ id: 50, status: 'Sent' })
		})

		it('markInvoicePaid throws 400 when not Sent', async () => {
			invoiceRepository.findByPk.mockResolvedValue(invoiceRow() as never)

			await expect(invoiceService.markInvoicePaid(50)).rejects.toMatchObject({
				statusCode: 400,
			})
		})

		it('voidInvoice allows Draft or Sent but not Paid', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ status: 'Paid' }) as never
			)

			await expect(invoiceService.voidInvoice(50)).rejects.toMatchObject({
				statusCode: 400,
			})
		})

		it('cancelInvoice allows Draft or Sent but not Void', async () => {
			invoiceRepository.findByPk.mockResolvedValue(
				invoiceRow({ status: 'Void' }) as never
			)

			await expect(invoiceService.cancelInvoice(50)).rejects.toMatchObject({
				statusCode: 400,
			})
		})
	})
})
