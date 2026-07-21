export interface CreateTimesheetEntryDTO {
	projectId: number
	entryDate: string
	hours: number
	/** API-facing name for the `description` column (see
	 * `src/models/TimesheetEntry.ts`) — kept distinct from the DB column
	 * name to match the API spec's request/response field. */
	taskDescription: string
}

export interface UpdateTimesheetEntryDTO {
	hours?: number
	taskDescription?: string
}

export interface TimesheetEntryFilterOptions {
	/** Ignored for callers without `TimesheetEntry_ManageAll` — the service
	 * forces the filter back to the caller's own `userId` in that case. */
	userId?: number
	projectId?: number
	startDate?: string
	endDate?: string
	timesheetPeriodId?: number
	isApproved?: boolean
	page: number
	perPage: number
}

export interface TimesheetEntryUserSummaryDTO {
	id: number
	fullName: string
}

export interface TimesheetEntryProjectSummaryDTO {
	id: number
	code: string
	name: string
}

export interface TimesheetEntryPeriodSummaryDTO {
	id: number
	startDate: string
	endDate: string
}

/** Full entry detail — returned by `GetTimesheetEntryById`/`UpdateTimesheetEntry`. */
export interface TimesheetEntryDetailDTO {
	id: number
	user: TimesheetEntryUserSummaryDTO
	project: TimesheetEntryProjectSummaryDTO
	timesheetPeriod: TimesheetEntryPeriodSummaryDTO
	entryDate: string
	hours: number
	taskDescription: string
	isApproved: boolean
	approvedBy: number | null
	approvedAt: Date | null
	createdAt: Date
	updatedAt: Date
}

/** Shape returned by `CreateTimesheetEntry` (mirrors the API spec's flatter
 * response — no separate `GetTimesheetEntryById` round-trip needed since
 * the service already has `project`/`timesheetPeriod` in hand). */
export interface TimesheetEntryCreateResponseDTO {
	id: number
	projectId: number
	projectName: string
	entryDate: string
	hours: number
	taskDescription: string
	isApproved: boolean
	timesheetPeriod: TimesheetEntryPeriodSummaryDTO
}

/** Row shape for `GetAllTimesheetEntries`'s `items` array. */
export interface TimesheetEntryListItemDTO {
	id: number
	user: TimesheetEntryUserSummaryDTO
	project: TimesheetEntryProjectSummaryDTO
	entryDate: string
	hours: number
	taskDescription: string
	isApproved: boolean
	createdAt: Date
}

export interface DailySummaryDTO {
	date: string
	totalHours: number
}

export interface WeeklySummaryDTO {
	weekStart: string
	weekEnd: string
	totalHours: number
}

export interface TimesheetEntryListResultDTO {
	items: TimesheetEntryListItemDTO[]
	totalCount: number
	dailySummaries: DailySummaryDTO[]
	weeklySummaries: WeeklySummaryDTO[]
	page: number
	pageSize: number
}

export interface ApproveTimesheetEntryResponseDTO {
	id: number
	isApproved: boolean
	approvedAt: Date | null
	approvedBy: number | null
}

export interface BulkApproveTimesheetEntriesDTO {
	entryIds: number[]
}

export interface BulkApproveResultDTO {
	approvedCount: number
	skippedCount: number
}
