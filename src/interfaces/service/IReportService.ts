import {
	MonthlyCostRevenueFilterOptions,
	MonthlyCostRevenueResultDTO,
	ReportExportFileDTO,
	ReportExportFormat,
	TimesheetReportFilterOptions,
	TimesheetReportResultDTO,
	UserRolesSummaryFilterOptions,
	UserRolesSummaryResultDTO,
} from '../../types/reportTypes'

export interface IReportService {
	generateTimesheetReport(
		options: TimesheetReportFilterOptions
	): Promise<TimesheetReportResultDTO>

	exportTimesheetReport(
		options: TimesheetReportFilterOptions,
		format: ReportExportFormat
	): Promise<ReportExportFileDTO>

	generateUserRolesSummary(
		options: UserRolesSummaryFilterOptions
	): Promise<UserRolesSummaryResultDTO>

	exportUserRolesSummary(
		options: UserRolesSummaryFilterOptions,
		format: ReportExportFormat
	): Promise<ReportExportFileDTO>

	generateMonthlyCostRevenue(
		options: MonthlyCostRevenueFilterOptions
	): Promise<MonthlyCostRevenueResultDTO>

	exportMonthlyCostRevenue(
		options: MonthlyCostRevenueFilterOptions,
		format: ReportExportFormat
	): Promise<ReportExportFileDTO>
}
