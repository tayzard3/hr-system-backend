import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { InvoiceController } from '../../controllers/InvoiceController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { INVOICE_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	generateInvoiceSchema,
	updateInvoiceSchema,
} from '../../validation/invoiceSchema'

const router = Router()
const invoiceController = container.get<InvoiceController>(
	TYPES.InvoiceController
)

router
	.route('/')
	.get(can(INVOICE_PERMISSION.LIST), invoiceController.getAllInvoices)
	.post(
		can(INVOICE_PERMISSION.GENERATE),
		zodSchemaValidator(generateInvoiceSchema),
		invoiceController.generateInvoice
	)
router
	.route('/:id')
	.get(can(INVOICE_PERMISSION.LIST), invoiceController.getInvoiceById)
	.put(
		can(INVOICE_PERMISSION.UPDATE),
		zodSchemaValidator(updateInvoiceSchema),
		invoiceController.updateInvoice
	)
	.delete(can(INVOICE_PERMISSION.DELETE), invoiceController.deleteInvoice)
router.route('/:id/send').put(can(INVOICE_PERMISSION.SEND), invoiceController.sendInvoice)
router
	.route('/:id/mark-paid')
	.put(can(INVOICE_PERMISSION.MARK_PAID), invoiceController.markInvoicePaid)
router.route('/:id/void').put(can(INVOICE_PERMISSION.VOID), invoiceController.voidInvoice)
router
	.route('/:id/cancel')
	.put(can(INVOICE_PERMISSION.CANCEL), invoiceController.cancelInvoice)
router
	.route('/:id/pdf')
	.get(can(INVOICE_PERMISSION.DOWNLOAD_PDF), invoiceController.getInvoicePdf)

export default router
