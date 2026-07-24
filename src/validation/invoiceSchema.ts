import z from 'zod'

const positiveIntSchema = (fieldName: string) =>
	z
		.number()
		.int()
		.positive({ message: `${fieldName} must be a positive integer` })

// `YYYY-MM-DD` — matches the `DATEONLY` columns (`billing_period_start/end`,
// `issued_date`, `due_date`), same convention as `createProjectSchema`'s/
// `createTimesheetEntrySchema`'s `dateOnlySchema`.
const dateOnlySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: 'must be a date in YYYY-MM-DD format',
	})

const clientNameSchema = z
	.string()
	.trim()
	.min(1, { message: 'clientName is required' })
	.max(255, { message: 'clientName cannot exceed 255 characters' })

const clientEmailSchema = z
	.string()
	.trim()
	.email({ message: 'clientEmail must be a valid email address' })
	.max(255, { message: 'clientEmail cannot exceed 255 characters' })

const notesSchema = z.string().trim().max(5000, {
	message: 'notes cannot exceed 5000 characters',
})

const generateInvoiceSchema = z
	.object({
		projectId: positiveIntSchema('projectId'),
		billingPeriodStart: dateOnlySchema,
		billingPeriodEnd: dateOnlySchema,
		currencyId: positiveIntSchema('currencyId'),
		clientName: clientNameSchema,
		clientEmail: clientEmailSchema.optional().nullable(),
		issuedDate: dateOnlySchema,
		dueDate: dateOnlySchema,
		notes: notesSchema.optional().nullable(),
	})
	.refine((data) => data.billingPeriodStart <= data.billingPeriodEnd, {
		message: 'billingPeriodStart must be on or before billingPeriodEnd',
		path: ['billingPeriodEnd'],
	})
	.refine((data) => data.issuedDate <= data.dueDate, {
		message: 'issuedDate must be on or before dueDate',
		path: ['dueDate'],
	})

// `currencyId` is accepted (mirroring the API spec's `UpdateInvoice` example
// body) but `InvoiceService.updateInvoice` rejects an actual currency change
// with a clear 400 — see `UpdateInvoiceDTO`'s doc-comment for why.
const updateInvoiceSchema = z
	.object({
		clientName: clientNameSchema.optional(),
		clientEmail: clientEmailSchema.optional().nullable(),
		issuedDate: dateOnlySchema.optional(),
		dueDate: dateOnlySchema.optional(),
		notes: notesSchema.optional().nullable(),
		currencyId: positiveIntSchema('currencyId').optional(),
	})
	.refine(
		(data) =>
			data.clientName !== undefined ||
			data.clientEmail !== undefined ||
			data.issuedDate !== undefined ||
			data.dueDate !== undefined ||
			data.notes !== undefined ||
			data.currencyId !== undefined,
		{ message: 'at least one field must be provided' }
	)
	.refine(
		(data) =>
			data.issuedDate === undefined ||
			data.dueDate === undefined ||
			data.issuedDate <= data.dueDate,
		{
			message: 'issuedDate must be on or before dueDate',
			path: ['dueDate'],
		}
	)

export { generateInvoiceSchema, updateInvoiceSchema }
