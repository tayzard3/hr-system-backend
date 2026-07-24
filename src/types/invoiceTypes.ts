import { InvoiceStatus } from '../models/Invoice'

export interface InvoiceProjectSummaryDTO {
	id: number
	code: string
	name: string
}

export interface InvoiceCurrencySummaryDTO {
	id: number
	code: string
	symbol: string
}

export interface InvoiceUserSummaryDTO {
	id: number
	fullName: string
}

export interface InvoiceResourceRoleTypeSummaryDTO {
	id: number
	name: string
}

/**
 * Request body for `POST /invoices` (API spec's `GenerateInvoice`).
 * `clientName`/`clientEmail` are point-in-time snapshots supplied by the
 * caller, NOT derived from `Project.clientName`/`clientEmail` — see the
 * doc-comment on those columns in the `invoices` migration/`Invoice` model.
 */
export interface GenerateInvoiceDTO {
	projectId: number
	billingPeriodStart: string
	billingPeriodEnd: string
	currencyId: number
	clientName: string
	clientEmail?: string | null
	issuedDate: string
	dueDate: string
	notes?: string | null
}

/**
 * Mirrors the API spec's `UpdateInvoice` request body, minus `currencyId`.
 * `currencyId` is intentionally NOT accepted here as a "change the invoice's
 * billing currency" operation — see `InvoiceService.updateInvoice`'s
 * doc-comment for why silently rescaling already-materialised line items
 * on a currency change is unsafe without an explicit product-defined
 * recalculation rule. A client that supplies `currencyId` equal to the
 * invoice's current currency is a no-op; supplying a different value is
 * rejected with a 400 (see `UpdateInvoiceDTO.currencyId`'s handling in the
 * service).
 */
export interface UpdateInvoiceDTO {
	clientName?: string
	clientEmail?: string | null
	issuedDate?: string
	dueDate?: string
	notes?: string | null
	currencyId?: number
}

export interface InvoiceFilterOptions {
	projectId?: number
	status?: InvoiceStatus
	/** `billingPeriodStart >= startDate` per the API spec. */
	startDate?: string
	/** `billingPeriodEnd <= endDate` per the API spec. */
	endDate?: string
	currencyId?: number
	page: number
	perPage: number
}

/** Row shape for `GetAllInvoices`'s `items` array. */
export interface InvoiceListItemDTO {
	id: number
	invoiceNumber: string
	project: InvoiceProjectSummaryDTO
	clientName: string
	billingPeriodStart: string
	billingPeriodEnd: string
	currency: InvoiceCurrencySummaryDTO
	totalAmount: number
	status: InvoiceStatus
	issuedDate: string
	dueDate: string
}

export interface InvoiceLineItemResponseDTO {
	id: number
	user: InvoiceUserSummaryDTO
	resourceRoleType: InvoiceResourceRoleTypeSummaryDTO
	timesheetEntryId: number
	description: string
	hours: number
	unitRate: number
	amount: number
}

/** Full detail — returned by `GetInvoiceById`. */
export interface InvoiceDetailDTO {
	id: number
	invoiceNumber: string
	project: InvoiceProjectSummaryDTO
	clientName: string
	clientEmail: string | null
	billingPeriodStart: string
	billingPeriodEnd: string
	currency: InvoiceCurrencySummaryDTO
	exchangeRate: number
	subTotal: number
	taxAmount: number
	totalAmount: number
	status: InvoiceStatus
	issuedDate: string
	dueDate: string
	notes: string | null
	lineItems: InvoiceLineItemResponseDTO[]
	createdAt: Date
}

/** Shape returned by `GenerateInvoice` (flatter than `InvoiceDetailDTO` —
 * mirrors the API spec's response example, which surfaces `lineItemCount`
 * instead of the full `lineItems` array). */
export interface InvoiceGenerateResponseDTO {
	id: number
	invoiceNumber: string
	projectId: number
	projectName: string
	clientName: string
	billingPeriodStart: string
	billingPeriodEnd: string
	currency: InvoiceCurrencySummaryDTO
	exchangeRate: number
	subTotal: number
	taxAmount: number
	totalAmount: number
	status: InvoiceStatus
	lineItemCount: number
}

/** Shape returned by `UpdateInvoice` ("Updated invoice summary" per the API
 * spec) — same fields as `InvoiceGenerateResponseDTO` plus `id`/`invoiceNumber`
 * already included, kept as a distinct alias so the two endpoints can diverge
 * independently later without a shared-type refactor. */
export type InvoiceUpdateResponseDTO = InvoiceGenerateResponseDTO

export interface InvoiceStatusUpdateResponseDTO {
	id: number
	status: InvoiceStatus
}
