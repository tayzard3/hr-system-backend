import express, { Application } from 'express'
import request from 'supertest'
import { InvoiceController } from '../InvoiceController'
import { IInvoiceService } from '../../interfaces/service/IInvoiceService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	generateInvoiceSchema,
	updateInvoiceSchema,
} from '../../validation/invoiceSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way invoiceRoutes.ts wires the real routes
// (validation middleware -> controller -> asyncHandler -> globalErrorHandler),
// but with a mocked IInvoiceService so no DI container / real DB is involved
// (same convention as RateCardController.test.ts).
describe('InvoiceController', () => {
	let invoiceServiceMock: jest.Mocked<IInvoiceService>
	let app: Application

	const invoiceSummaryDTO = {
		id: 50,
		invoiceNumber: 'INV-2026-0001',
		projectId: 1,
		projectName: 'Project One',
		clientName: 'Acme Corp',
		billingPeriodStart: '2026-06-01',
		billingPeriodEnd: '2026-06-30',
		currency: { id: 1, code: 'SGD', symbol: 'S$' },
		exchangeRate: 1,
		subTotal: 1125,
		taxAmount: 0,
		totalAmount: 1125,
		status: 'Draft',
		lineItemCount: 1,
	}

	const invoiceDetailDTO = {
		id: 50,
		invoiceNumber: 'INV-2026-0001',
		project: { id: 1, code: 'PRJ-1', name: 'Project One' },
		clientName: 'Acme Corp',
		clientEmail: 'billing@acme.com',
		billingPeriodStart: '2026-06-01',
		billingPeriodEnd: '2026-06-30',
		currency: { id: 1, code: 'SGD', symbol: 'S$' },
		exchangeRate: 1,
		subTotal: 1125,
		taxAmount: 0,
		totalAmount: 1125,
		status: 'Draft',
		issuedDate: '2026-07-01',
		dueDate: '2026-07-31',
		notes: null,
		lineItems: [],
		createdAt: new Date('2026-07-01T00:00:00Z').toISOString(),
	}

	beforeEach(() => {
		invoiceServiceMock = {
			generateInvoice: jest.fn(),
			getAllInvoices: jest.fn(),
			getInvoiceById: jest.fn(),
			updateInvoice: jest.fn(),
			deleteInvoice: jest.fn(),
			sendInvoice: jest.fn(),
			markInvoicePaid: jest.fn(),
			voidInvoice: jest.fn(),
			cancelInvoice: jest.fn(),
			getInvoiceForPdf: jest.fn(),
		} as unknown as jest.Mocked<IInvoiceService>

		const invoiceController = new InvoiceController(invoiceServiceMock)

		app = express()
		app.use(express.json())
		app
			.route('/invoices')
			.get(invoiceController.getAllInvoices)
			.post(
				zodSchemaValidator(generateInvoiceSchema),
				invoiceController.generateInvoice
			)
		app
			.route('/invoices/:id')
			.get(invoiceController.getInvoiceById)
			.put(
				zodSchemaValidator(updateInvoiceSchema),
				invoiceController.updateInvoice
			)
			.delete(invoiceController.deleteInvoice)
		app.route('/invoices/:id/send').put(invoiceController.sendInvoice)
		app.route('/invoices/:id/mark-paid').put(invoiceController.markInvoicePaid)
		app.route('/invoices/:id/void').put(invoiceController.voidInvoice)
		app.route('/invoices/:id/cancel').put(invoiceController.cancelInvoice)
		app.route('/invoices/:id/pdf').get(invoiceController.getInvoicePdf)
		app.use(globalErrorHandler)
	})

	describe('POST /invoices (generateInvoice)', () => {
		const validBody = {
			projectId: 1,
			billingPeriodStart: '2026-06-01',
			billingPeriodEnd: '2026-06-30',
			currencyId: 1,
			clientName: 'Acme Corp',
			clientEmail: 'billing@acme.com',
			issuedDate: '2026-07-01',
			dueDate: '2026-07-31',
			notes: 'June services',
		}

		it('returns 422 when required fields are missing', async () => {
			const res = await request(app).post('/invoices').send({})

			expect(res.body.statusCode).toBe(422)
			expect(invoiceServiceMock.generateInvoice).not.toHaveBeenCalled()
		})

		it('returns 422 when billingPeriodEnd precedes billingPeriodStart', async () => {
			const res = await request(app)
				.post('/invoices')
				.send({
					...validBody,
					billingPeriodStart: '2026-06-30',
					billingPeriodEnd: '2026-06-01',
				})

			expect(res.body.statusCode).toBe(422)
			expect(invoiceServiceMock.generateInvoice).not.toHaveBeenCalled()
		})

		it('generates the invoice and returns 201 on success', async () => {
			invoiceServiceMock.generateInvoice.mockResolvedValue(
				invoiceSummaryDTO as never
			)

			const res = await request(app).post('/invoices').send(validBody)

			expect(invoiceServiceMock.generateInvoice).toHaveBeenCalledWith(
				expect.objectContaining(validBody)
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(invoiceSummaryDTO)
		})

		it('propagates a domain AppException (e.g. duplicate billing period) through the central error handler', async () => {
			invoiceServiceMock.generateInvoice.mockRejectedValue(
				new AppException(
					'An invoice already exists for this project and billing period',
					409
				)
			)

			const res = await request(app).post('/invoices').send(validBody)

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /invoices', () => {
		it('parses filter query params through to the service', async () => {
			invoiceServiceMock.getAllInvoices.mockResolvedValue({
				data: [],
				total: 0,
			} as never)

			await request(app).get(
				'/invoices?projectId=1&status=Draft&startDate=2026-06-01&endDate=2026-06-30&currencyId=1&page=2&pageSize=10'
			)

			expect(invoiceServiceMock.getAllInvoices).toHaveBeenCalledWith(
				expect.objectContaining({
					projectId: 1,
					status: 'Draft',
					startDate: '2026-06-01',
					endDate: '2026-06-30',
					currencyId: 1,
					page: 2,
					perPage: 10,
				})
			)
		})
	})

	describe('GET /invoices/:id', () => {
		it('returns the invoice detail when found', async () => {
			invoiceServiceMock.getInvoiceById.mockResolvedValue(
				invoiceDetailDTO as never
			)

			const res = await request(app).get('/invoices/50')

			expect(invoiceServiceMock.getInvoiceById).toHaveBeenCalledWith(50)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(invoiceDetailDTO)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			invoiceServiceMock.getInvoiceById.mockRejectedValue(
				new AppException('Invoice not found', 404)
			)

			const res = await request(app).get('/invoices/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /invoices/:id (update)', () => {
		it('returns 422 when the body is empty', async () => {
			const res = await request(app).put('/invoices/50').send({})

			expect(res.body.statusCode).toBe(422)
			expect(invoiceServiceMock.updateInvoice).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the invoice was not found', async () => {
			invoiceServiceMock.updateInvoice.mockResolvedValue(null)

			const res = await request(app)
				.put('/invoices/999')
				.send({ notes: 'Revised' })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the invoice and returns 200 on success', async () => {
			invoiceServiceMock.updateInvoice.mockResolvedValue(
				invoiceSummaryDTO as never
			)

			const res = await request(app)
				.put('/invoices/50')
				.send({ notes: 'Revised terms' })

			expect(invoiceServiceMock.updateInvoice).toHaveBeenCalledWith(
				50,
				expect.objectContaining({ notes: 'Revised terms' })
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(invoiceSummaryDTO)
		})
	})

	describe('DELETE /invoices/:id', () => {
		it('returns 404 when the invoice was not found', async () => {
			invoiceServiceMock.deleteInvoice.mockResolvedValue(false)

			const res = await request(app).delete('/invoices/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the invoice and returns 200 on success', async () => {
			invoiceServiceMock.deleteInvoice.mockResolvedValue(true)

			const res = await request(app).delete('/invoices/50')

			expect(invoiceServiceMock.deleteInvoice).toHaveBeenCalledWith(50)
			expect(res.body.statusCode).toBe(200)
		})
	})

	describe('status transition endpoints', () => {
		it('PUT /invoices/:id/send returns the updated status', async () => {
			invoiceServiceMock.sendInvoice.mockResolvedValue({ id: 50, status: 'Sent' } as never)

			const res = await request(app).put('/invoices/50/send')

			expect(invoiceServiceMock.sendInvoice).toHaveBeenCalledWith(50)
			expect(res.body.data).toEqual({ id: 50, status: 'Sent' })
		})

		it('PUT /invoices/:id/mark-paid returns the updated status', async () => {
			invoiceServiceMock.markInvoicePaid.mockResolvedValue({
				id: 50,
				status: 'Paid',
			} as never)

			const res = await request(app).put('/invoices/50/mark-paid')

			expect(invoiceServiceMock.markInvoicePaid).toHaveBeenCalledWith(50)
			expect(res.body.data).toEqual({ id: 50, status: 'Paid' })
		})

		it('PUT /invoices/:id/void returns the updated status', async () => {
			invoiceServiceMock.voidInvoice.mockResolvedValue({ id: 50, status: 'Void' } as never)

			const res = await request(app).put('/invoices/50/void')

			expect(invoiceServiceMock.voidInvoice).toHaveBeenCalledWith(50)
			expect(res.body.data).toEqual({ id: 50, status: 'Void' })
		})

		it('PUT /invoices/:id/cancel returns the updated status', async () => {
			invoiceServiceMock.cancelInvoice.mockResolvedValue({
				id: 50,
				status: 'Cancelled',
			} as never)

			const res = await request(app).put('/invoices/50/cancel')

			expect(invoiceServiceMock.cancelInvoice).toHaveBeenCalledWith(50)
			expect(res.body.data).toEqual({ id: 50, status: 'Cancelled' })
		})

		it('propagates a domain AppException (e.g. invalid transition) through the central error handler', async () => {
			invoiceServiceMock.sendInvoice.mockRejectedValue(
				new AppException('Only Draft invoices can be sent', 400)
			)

			const res = await request(app).put('/invoices/50/send')

			expect(res.body.statusCode).toBe(400)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /invoices/:id/pdf', () => {
		it('streams a PDF with the expected headers', async () => {
			invoiceServiceMock.getInvoiceForPdf.mockResolvedValue(
				invoiceDetailDTO as never
			)

			const res = await request(app).get('/invoices/50/pdf')

			expect(invoiceServiceMock.getInvoiceForPdf).toHaveBeenCalledWith(50)
			expect(res.status).toBe(200)
			expect(res.headers['content-type']).toBe('application/pdf')
			expect(res.headers['content-disposition']).toBe(
				'attachment; filename="INV-2026-0001.pdf"'
			)
			expect(res.body.length).toBeGreaterThan(0)
		})
	})
})
