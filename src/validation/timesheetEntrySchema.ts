import z from 'zod'

// `YYYY-MM-DD` — matches the `DATEONLY` `entry_date` column, same convention
// as `createProjectSchema`'s/`createTimesheetPeriodSchema`'s `dateOnlySchema`.
const dateOnlySchema = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, {
		message: 'must be a date in YYYY-MM-DD format',
	})

// `hours` is a `DECIMAL(4,2)` column — cap at 2 decimal places and a sane
// upper bound (24h/day); the project-specific `maxDailyHours` cap is
// enforced in `TimesheetEntryService` since it needs the project row.
const hoursSchema = z
	.number()
	.positive({ message: 'hours must be greater than 0' })
	.max(24, { message: 'hours cannot exceed 24' })
	.refine((value) => Number(value.toFixed(2)) === value, {
		message: 'hours supports at most 2 decimal places',
	})

const taskDescriptionSchema = z
	.string()
	.trim()
	.min(1, { message: 'taskDescription is required' })

const createTimesheetEntrySchema = z.object({
	projectId: z
		.number()
		.int()
		.positive({ message: 'projectId must be a positive integer' }),
	entryDate: dateOnlySchema,
	hours: hoursSchema,
	taskDescription: taskDescriptionSchema,
})

const updateTimesheetEntrySchema = z
	.object({
		hours: hoursSchema.optional(),
		taskDescription: taskDescriptionSchema.optional(),
	})
	.refine((data) => data.hours !== undefined || data.taskDescription !== undefined, {
		message: 'at least one of hours or taskDescription must be provided',
	})

const bulkApproveTimesheetEntriesSchema = z.object({
	entryIds: z
		.array(
			z
				.number()
				.int()
				.positive({ message: 'entryIds must contain positive integers' })
		)
		.min(1, { message: 'entryIds must contain at least one id' }),
})

export {
	createTimesheetEntrySchema,
	updateTimesheetEntrySchema,
	bulkApproveTimesheetEntriesSchema,
}
