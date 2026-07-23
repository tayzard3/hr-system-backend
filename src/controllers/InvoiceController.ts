import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IInvoiceService } from '../interfaces/service/IInvoiceService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import { generateInvoicePdfBuffer } from '../utils/invoicePdf'
import appConfig from '../utils/config'
import { InvoiceFilterOptions } from '../types/invoiceTypes'
import { InvoiceStatus } from '../models/Invoice'

@injectable()
export class InvoiceController {
	constructor(
		@inject(TYPES.IInvoiceService)
		private invoiceService: IInvoiceService
	) {}

	public generateInvoice = asyncHandler(async (req: Request, res: Response) => {
		const invoice = await this.invoiceService.generateInvoice(req.body)
		responseHandler(res, 201, {
			message: 'Invoice generated successfully',
			data: invoice,
		})
	})

	public getAllInvoices = asyncHandler(async (req: Request, res: Response) => {
		const options: InvoiceFilterOptions = {
			projectId: req.query.projectId
				? parseInt(req.query.projectId as string, 10)
				: undefined,
			status: req.query.status as InvoiceStatus | undefined,
			startDate: req.query.startDate as string | undefined,
			endDate: req.query.endDate as string | undefined,
			currencyId: req.query.currencyId
				? parseInt(req.query.currencyId as string, 10)
				: undefined,
			page: parseInt(req.query.page as string, 10) || 1,
			perPage:
				parseInt(req.query.pageSize as string, 10) ||
				parseInt(appConfig.DEFAULT_PAGINATE, 10),
		}

		const invoices = await this.invoiceService.getAllInvoices(options)

		responseHandler(res, 200, {
			message: 'Invoices retrieved successfully',
			data: invoices,
		})
	})

	public getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
		const invoice = await this.invoiceService.getInvoiceById(
			parseInt(req.params.id as string, 10)
		)
		responseHandler(res, 200, {
			message: 'Invoice retrieved successfully',
			data: invoice,
		})
	})

	public updateInvoice = asyncHandler(async (req: Request, res: Response) => {
		const invoice = await this.invoiceService.updateInvoice(
			parseInt(req.params.id as string, 10),
			req.body
		)
		if (!invoice) {
			return responseHandler(res, 404, { message: 'Invoice not found' })
		}
		responseHandler(res, 200, {
			message: 'Invoice updated successfully',
			data: invoice,
		})
	})

	public deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
		const deleted = await this.invoiceService.deleteInvoice(
			parseInt(req.params.id as string, 10)
		)
		if (!deleted) {
			return responseHandler(res, 404, { message: 'Invoice not found' })
		}
		responseHandler(res, 200, { message: 'Invoice deleted.' })
	})

	public sendInvoice = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.invoiceService.sendInvoice(
			parseInt(req.params.id as string, 10)
		)
		responseHandler(res, 200, {
			message: 'Invoice sent successfully',
			data: result,
		})
	})

	public markInvoicePaid = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.invoiceService.markInvoicePaid(
			parseInt(req.params.id as string, 10)
		)
		responseHandler(res, 200, {
			message: 'Invoice marked as paid successfully',
			data: result,
		})
	})

	public voidInvoice = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.invoiceService.voidInvoice(
			parseInt(req.params.id as string, 10)
		)
		responseHandler(res, 200, {
			message: 'Invoice voided successfully',
			data: result,
		})
	})

	public cancelInvoice = asyncHandler(async (req: Request, res: Response) => {
		const result = await this.invoiceService.cancelInvoice(
			parseInt(req.params.id as string, 10)
		)
		responseHandler(res, 200, {
			message: 'Invoice cancelled successfully',
			data: result,
		})
	})

	/**
	 * Unlike every other handler here, the response is a raw PDF stream rather
	 * than the standard JSON envelope (`responseHandler`) — the API spec
	 * documents `GetInvoicePdf`'s response as
	 * `Content-Type: application/pdf` / `Content-Disposition: attachment`, same
	 * "file download, not a JSON envelope" shape as the (not-yet-implemented)
	 * Module 5 report export endpoints. PDF assembly itself lives in
	 * `generateInvoicePdfBuffer` (`src/utils/invoicePdf.ts`), a plain rendering
	 * utility — this handler only fetches the data via the service and shapes
	 * the HTTP response, keeping with "controllers only orchestrate".
	 */
	public getInvoicePdf = asyncHandler(async (req: Request, res: Response) => {
		const invoice = await this.invoiceService.getInvoiceForPdf(
			parseInt(req.params.id as string, 10)
		)
		const pdfBuffer = await generateInvoicePdfBuffer(invoice)

		res.setHeader('Content-Type', 'application/pdf')
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${invoice.invoiceNumber}.pdf"`
		)
		res.send(pdfBuffer)
	})
}
