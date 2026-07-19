import z from 'zod'

// `YYYY-MM-DD` — matches the `DATEONLY` columns (`start_date`/`end_date`).
const dateOnlySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: 'must be a date in YYYY-MM-DD format',
	})

const createProjectSchema = z.object({
	code: z
		.string()
		.trim()
		.min(1, { message: 'code is required' })
		.max(50, { message: 'code cannot exceed 50 characters' }),
	name: z
		.string()
		.trim()
		.min(1, { message: 'name is required' })
		.max(255, { message: 'name cannot exceed 255 characters' }),
	description: z.string().trim().optional().nullable(),
	clientName: z
		.string()
		.trim()
		.max(255, { message: 'clientName cannot exceed 255 characters' })
		.optional()
		.nullable(),
	clientEmail: z
		.string()
		.trim()
		.email({ message: 'clientEmail must be a valid email address' })
		.max(255, { message: 'clientEmail cannot exceed 255 characters' })
		.optional()
		.nullable(),
	startDate: dateOnlySchema,
	endDate: dateOnlySchema.optional().nullable(),
	// Cross-field ordering (endDate >= startDate) is enforced in
	// ProjectService rather than here, so partial updates that only touch
	// one of the two dates are still checked against the persisted value.
	maxDailyHours: z
		.number()
		.positive({ message: 'maxDailyHours must be greater than 0' })
		.max(24, { message: 'maxDailyHours cannot exceed 24' })
		.optional(),
})

const updateProjectSchema = createProjectSchema.partial()

export { createProjectSchema, updateProjectSchema }
