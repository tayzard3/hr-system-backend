import z from 'zod'

// `YYYY-MM-DD` — matches the `DATEONLY` columns (`start_date`/`end_date`),
// same convention as `createProjectSchema`'s `dateOnlySchema`.
const dateOnlySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: 'must be a date in YYYY-MM-DD format',
	})

const createTimesheetPeriodSchema = z.object({
	startDate: dateOnlySchema,
	endDate: dateOnlySchema,
	// Cross-field ordering (endDate >= startDate) is enforced in
	// TimesheetPeriodService rather than here, matching createProjectSchema's
	// convention.
})

export { createTimesheetPeriodSchema }
