import PDFDocument from 'pdfkit'
import { InvoiceDetailDTO } from '../types/invoiceTypes'

/**
 * Renders `GetInvoicePdf`'s "standard template" as a PDF buffer, using
 * `pdfkit` (stream-based, no headless browser / HTML-to-PDF dependency
 * needed — a good fit for a simple, structured financial document like an
 * invoice). This is a stateless rendering utility, not a DI-bound service:
 * it has no dependencies of its own and is invoked directly from
 * `InvoiceController.getInvoicePdf`, the same way `responseHandler`/
 * `Paginator` are plain utilities rather than injected collaborators.
 *
 * New convention introduced by this feature (Module 5's `ExportTimesheetReport`
 * etc. are not implemented yet in this codebase, so there was no existing
 * file-generation pattern to mirror) — flagged for addition to CLAUDE.md if
 * a future report/export feature wants to reuse it.
 */
export const generateInvoicePdfBuffer = (
	invoice: InvoiceDetailDTO
): Promise<Buffer> => {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: 'A4', margin: 50 })
		const chunks: Buffer[] = []

		doc.on('data', (chunk: Buffer) => chunks.push(chunk))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		doc.on('error', reject)

		const { symbol } = invoice.currency
		const money = (value: number) => `${symbol}${value.toFixed(2)}`

		doc.fontSize(20).text('INVOICE', { align: 'right' })
		doc.moveDown(0.5)
		doc.fontSize(10).text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' })
		doc.text(`Status: ${invoice.status}`, { align: 'right' })
		doc.text(`Issued Date: ${invoice.issuedDate}`, { align: 'right' })
		doc.text(`Due Date: ${invoice.dueDate}`, { align: 'right' })

		doc.moveDown(1.5)
		doc.fontSize(12).text('Bill To:')
		doc.fontSize(10).text(invoice.clientName)
		if (invoice.clientEmail) {
			doc.text(invoice.clientEmail)
		}

		doc.moveDown(0.5)
		doc.fontSize(12).text('Project:')
		doc
			.fontSize(10)
			.text(`${invoice.project.code} — ${invoice.project.name}`)
		doc.text(
			`Billing Period: ${invoice.billingPeriodStart} to ${invoice.billingPeriodEnd}`
		)

		doc.moveDown(1)
		doc.fontSize(12).text('Line Items:')
		doc.moveDown(0.25)

		const tableTop = doc.y
		const columns = {
			description: 50,
			hours: 300,
			unitRate: 360,
			amount: 440,
		}

		doc
			.fontSize(9)
			.text('Description', columns.description, tableTop)
			.text('Hours', columns.hours, tableTop)
			.text('Unit Rate', columns.unitRate, tableTop)
			.text('Amount', columns.amount, tableTop)
		doc
			.moveTo(50, tableTop + 15)
			.lineTo(545, tableTop + 15)
			.stroke()

		let y = tableTop + 22
		for (const lineItem of invoice.lineItems) {
			if (y > 700) {
				doc.addPage()
				y = 50
			}
			const label = `${lineItem.user.fullName} (${lineItem.resourceRoleType.name}) — ${lineItem.description}`
			doc.fontSize(9).text(label, columns.description, y, { width: 240 })
			doc.text(lineItem.hours.toFixed(2), columns.hours, y)
			doc.text(money(lineItem.unitRate), columns.unitRate, y)
			doc.text(money(lineItem.amount), columns.amount, y)
			y += 18
		}

		doc.moveTo(50, y + 5).lineTo(545, y + 5).stroke()
		y += 15

		doc.fontSize(10).text(`Sub Total: ${money(invoice.subTotal)}`, columns.unitRate, y)
		y += 15
		doc.text(`Tax: ${money(invoice.taxAmount)}`, columns.unitRate, y)
		y += 15
		doc
			.fontSize(11)
			.text(`Total: ${money(invoice.totalAmount)}`, columns.unitRate, y)

		if (invoice.notes) {
			doc.moveDown(2)
			doc.fontSize(10).text('Notes:')
			doc.fontSize(9).text(invoice.notes)
		}

		doc.end()
	})
}
