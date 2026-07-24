import { PaginationResult } from '../../utils/Paginator'
import {
	GenerateInvoiceDTO,
	InvoiceDetailDTO,
	InvoiceFilterOptions,
	InvoiceGenerateResponseDTO,
	InvoiceListItemDTO,
	InvoiceStatusUpdateResponseDTO,
	InvoiceUpdateResponseDTO,
	UpdateInvoiceDTO,
} from '../../types/invoiceTypes'

export interface IInvoiceService {
	generateInvoice(
		data: GenerateInvoiceDTO
	): Promise<InvoiceGenerateResponseDTO>
	getAllInvoices(
		options: InvoiceFilterOptions
	): Promise<PaginationResult<InvoiceListItemDTO>>
	getInvoiceById(id: number): Promise<InvoiceDetailDTO>
	updateInvoice(
		id: number,
		data: UpdateInvoiceDTO
	): Promise<InvoiceUpdateResponseDTO | null>
	deleteInvoice(id: number): Promise<boolean>
	sendInvoice(id: number): Promise<InvoiceStatusUpdateResponseDTO>
	markInvoicePaid(id: number): Promise<InvoiceStatusUpdateResponseDTO>
	voidInvoice(id: number): Promise<InvoiceStatusUpdateResponseDTO>
	cancelInvoice(id: number): Promise<InvoiceStatusUpdateResponseDTO>
	/** Returns the full detail needed to render the invoice PDF — reuses
	 * `InvoiceDetailDTO` since `GetInvoicePdf`'s "standard template" needs the
	 * same data as `GetInvoiceById`. */
	getInvoiceForPdf(id: number): Promise<InvoiceDetailDTO>
}
