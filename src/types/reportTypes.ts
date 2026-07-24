/** Shared summary shapes reused across every Module 5 report. */
export interface ReportUserSummaryDTO {
	id: number
	fullName: string
	/**
	 * The API spec's report examples include `employeeId` on the user
	 * summary (see `GenerateTimesheetReport`/`ExportTimesheetReport` in
	 * `docs/API_Endpoint_Specification.md`), but no `employeeId` column
	 * exists on `User` anywhere in this codebase yet (Module 1's
	 * `CreateUser` request body documents it too, but it was never added to
	 * the `User` model/migration). Adding it now would mean changing
	 * `User` (Module 1), which is out of scope for this Reports feature —
	 * flagged as a follow-up for whoever owns Module 1. Always `null` here
	 * until that lands.
	 */
	employeeId: string | null
}

export interface ReportProjectSummaryDTO {
	id: number
	code: string
	name: string
}

export interface ReportResourceRoleTypeSummaryDTO {
	/**
	 * `null` backs the "Unassigned" bucket — hours logged by a user who has
	 * no *currently* active `ProjectResourceAssignment` on the project (e.g.
	 * the assignment was later removed). See the doc-comment on
	 * `ReportService.resolveAssignmentContext` for why "currently active" is
	 * the best available signal instead of a point-in-time snapshot.
	 */
	id: number | null
	name: string
}

export interface ReportCurrencySummaryDTO {
	id: number
	code: string
	symbol: string
}

/** Export formats supported by every `Export*` report endpoint. */
export type ReportExportFormat = 'xlsx' | 'csv'

/** Returned by `ReportService.export*` methods; the controller streams
 * `buffer` back as the raw response body (bypassing the standard JSON
 * envelope), per the API spec's documented file-download response shape. */
export interface ReportExportFileDTO {
	fileName: string
	contentType: string
	buffer: Buffer
}

// ---------------------------------------------------------------------------
// GenerateTimesheetReport / ExportTimesheetReport (RP-01, RP-02)
// ---------------------------------------------------------------------------

export interface TimesheetReportFilterOptions {
	startDate: string
	endDate: string
	projectId?: number
	userId?: number
	isApproved?: boolean
	page: number
	perPage: number
}

export interface TimesheetReportItemDTO {
	user: ReportUserSummaryDTO
	project: ReportProjectSummaryDTO
	entryDate: string
	hours: number
	taskDescription: string
	isApproved: boolean
}

export interface TimesheetReportResultDTO {
	reportGeneratedAt: Date
	startDate: string
	endDate: string
	totalHours: number
	items: TimesheetReportItemDTO[]
	totalCount: number
}

// ---------------------------------------------------------------------------
// GenerateUserRolesSummary / ExportUserRolesSummary (RP-03)
// ---------------------------------------------------------------------------

export interface UserRolesSummaryFilterOptions {
	startDate: string
	endDate: string
	projectId?: number
}

export interface UserRolesSummaryItemDTO {
	resourceRoleType: ReportResourceRoleTypeSummaryDTO
	totalHours: number
	userCount: number
}

export interface UserRolesSummaryResultDTO {
	startDate: string
	endDate: string
	summary: UserRolesSummaryItemDTO[]
	grandTotalHours: number
}

// ---------------------------------------------------------------------------
// GenerateMonthlyCostRevenue / ExportMonthlyCostRevenue (RP-04)
// ---------------------------------------------------------------------------

export interface MonthlyCostRevenueFilterOptions {
	year: number
	month: number
	projectId?: number
	/** Defaults to the active base currency (`Currency.isBaseCurrency`) when omitted. */
	currencyId?: number
}

export interface MonthlyCostRevenueBreakdownDTO {
	resourceRoleType: string
	hours: number
	/** `null` when no effective rate card was found for the (country, role
	 * type) pair as of the report month — hours are still counted in the
	 * project/report totals, but cost/revenue for that bucket is 0 and this
	 * flag lets the caller know the figures are incomplete. */
	costRate: number | null
	billingRate: number | null
	cost: number
	revenue: number
}

export interface MonthlyCostRevenueProjectDTO {
	project: ReportProjectSummaryDTO
	totalHours: number
	totalCost: number
	totalRevenue: number
	margin: number
	breakdown: MonthlyCostRevenueBreakdownDTO[]
}

export interface MonthlyCostRevenueResultDTO {
	year: number
	month: number
	currency: ReportCurrencySummaryDTO
	projects: MonthlyCostRevenueProjectDTO[]
}
