import z from 'zod'

const positiveIntSchema = (fieldName: string) =>
	z
		.number()
		.int()
		.positive({ message: `${fieldName} must be a positive integer` })

// `YYYY-MM-DD` — matches the `DATEONLY` `effective_date` column, same
// convention as `rateCardSchema`'s/`createTimesheetEntrySchema`'s
// `dateOnlySchema`.
const dateOnlySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: 'must be a date in YYYY-MM-DD format',
	})

// `rate` is a `DECIMAL(18,6)` column — cap at 6 decimal places and the
// column's max magnitude (12 digits before the decimal point).
const rateSchema = z
	.number()
	.positive({ message: 'rate must be greater than 0' })
	.max(999999999999.999999, {
		message: 'rate exceeds the maximum allowed value',
	})
	.refine((value) => Number(value.toFixed(6)) === value, {
		message: 'rate supports at most 6 decimal places',
	})

const createExchangeRateSchema = z
	.object({
		fromCurrencyId: positiveIntSchema('fromCurrencyId'),
		toCurrencyId: positiveIntSchema('toCurrencyId'),
		rate: rateSchema,
		effectiveDate: dateOnlySchema,
		isActive: z.boolean().optional(),
	})
	.refine((data) => data.fromCurrencyId !== data.toCurrencyId, {
		message: 'fromCurrencyId and toCurrencyId must be different',
		path: ['toCurrencyId'],
	})

const updateExchangeRateSchema = z
	.object({
		rate: rateSchema.optional(),
		effectiveDate: dateOnlySchema.optional(),
		isActive: z.boolean().optional(),
	})
	.refine(
		(data) =>
			data.rate !== undefined ||
			data.effectiveDate !== undefined ||
			data.isActive !== undefined,
		{ message: 'at least one field must be provided' }
	)

export { createExchangeRateSchema, updateExchangeRateSchema }
