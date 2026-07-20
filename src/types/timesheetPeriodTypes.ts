export interface TimesheetPeriodFilterOptions {
	isLocked?: boolean
	year?: number
	month?: number
}

export interface CreateTimesheetPeriodDTO {
	startDate: string
	endDate: string
}

/**
 * API-facing shape of a timesheet period. `year`/`month` are internal
 * denormalized columns used only to back the `GetAllTimesheetPeriods`
 * filters (see the migration note on `timesheet_periods.year`/`.month`) —
 * they are intentionally omitted from the response DTO since `startDate`
 * already conveys the same information to API consumers.
 */
export interface TimesheetPeriodResponseDTO {
	id: number
	startDate: string
	endDate: string
	isLocked: boolean
	lockedAt: Date | null
	lockedBy: number | null
}
