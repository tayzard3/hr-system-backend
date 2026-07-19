import z from 'zod'

const createCountrySchema = z.object({
	code: z
		.string()
		.trim()
		.length(2, { message: 'code must be a 2-character ISO country code' })
		.regex(/^[a-zA-Z]{2}$/, { message: 'code must contain only letters' }),
	name: z
		.string()
		.trim()
		.min(1, { message: 'name is required' })
		.max(255, { message: 'name cannot exceed 255 characters' }),
})

const updateCountrySchema = z.object({
	code: z
		.string()
		.trim()
		.length(2, { message: 'code must be a 2-character ISO country code' })
		.regex(/^[a-zA-Z]{2}$/, { message: 'code must contain only letters' })
		.optional(),
	name: z
		.string()
		.trim()
		.min(1, { message: 'name is required' })
		.max(255, { message: 'name cannot exceed 255 characters' })
		.optional(),
})

export { createCountrySchema, updateCountrySchema }
