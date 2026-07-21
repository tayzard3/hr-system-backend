import z from 'zod'

const createCurrencySchema = z.object({
	code: z
		.string()
		.trim()
		.length(3, { message: 'code must be a 3-character ISO currency code' })
		.regex(/^[a-zA-Z]{3}$/, { message: 'code must contain only letters' }),
	name: z
		.string()
		.trim()
		.min(1, { message: 'name is required' })
		.max(255, { message: 'name cannot exceed 255 characters' }),
	symbol: z
		.string()
		.trim()
		.min(1, { message: 'symbol is required' })
		.max(10, { message: 'symbol cannot exceed 10 characters' }),
	isBaseCurrency: z.boolean().optional(),
})

const updateCurrencySchema = createCurrencySchema.partial().extend({
	isActive: z.boolean().optional(),
})

export { createCurrencySchema, updateCurrencySchema }
