import z from 'zod'

const positiveIntSchema = (fieldName: string) =>
	z
		.number()
		.int()
		.positive({ message: `${fieldName} must be a positive integer` })

// `YYYY-MM-DD` — matches the `DATEONLY` `effective_date` column, same
// convention as `createTimesheetEntrySchema`'s/`createProjectSchema`'s
// `dateOnlySchema`.
const dateOnlySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: 'must be a date in YYYY-MM-DD format',
	})

// `cost_rate`/`billing_rate` are `DECIMAL(12,2)` columns — cap at 2 decimal
// places and the column's max magnitude (10 digits before the decimal
// point).
const rateAmountSchema = (fieldName: string) =>
	z
		.number()
		.positive({ message: `${fieldName} must be greater than 0` })
		.max(9999999999.99, {
			message: `${fieldName} exceeds the maximum allowed value`,
		})
		.refine((value) => Number(value.toFixed(2)) === value, {
			message: `${fieldName} supports at most 2 decimal places`,
		})

const createRateCardSchema = z.object({
	countryId: positiveIntSchema('countryId'),
	resourceRoleTypeId: positiveIntSchema('resourceRoleTypeId'),
	currencyId: positiveIntSchema('currencyId'),
	hourlyRate: rateAmountSchema('hourlyRate'),
	effectiveDate: dateOnlySchema,
	isActive: z.boolean().optional(),
	// Not part of the documented `CreateRateCard` request body in the API
	// spec (see `CreateRateCardDTO`'s doc-comment) — kept optional so the
	// internal cost side of the rate can be supplied once product confirms
	// how it should flow in; defaults to `hourlyRate` when omitted.
	costRate: rateAmountSchema('costRate').optional(),
})

const updateRateCardSchema = z
	.object({
		hourlyRate: rateAmountSchema('hourlyRate').optional(),
		effectiveDate: dateOnlySchema.optional(),
		isActive: z.boolean().optional(),
		currencyId: positiveIntSchema('currencyId').optional(),
		costRate: rateAmountSchema('costRate').optional(),
	})
	.refine(
		(data) =>
			data.hourlyRate !== undefined ||
			data.effectiveDate !== undefined ||
			data.isActive !== undefined ||
			data.currencyId !== undefined ||
			data.costRate !== undefined,
		{ message: 'at least one field must be provided' }
	)

export { createRateCardSchema, updateRateCardSchema }
