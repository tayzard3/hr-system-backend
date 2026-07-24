import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IReportService } from '../interfaces/service/IReportService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import AppException from '../exceptions/AppException'
import {
	MonthlyCostRevenueFilterOptions,
	ReportExportFormat,
	TimesheetReportFilterOptions,
	UserRolesSummaryFilterOptions,
} from '../types/reportTypes'

/** Spec-mandated default page size for `GenerateTimesheetReport` (100) — a
 * fixed literal rather than `appConfig.DEFAULT_PAGINATE` (which backs the
 * generic list endpoints elsewhere), since the API spec calls out `100`
 * specifically for this endpoint (same convention as
 * `TimesheetEntryController.DEFAULT_TIMESHEET_ENTRY_PAGE_SIZE`). */
const DEFAULT_TIMESHEET_REPORT_PAGE_SIZE = 100

const SUPPORTED_EXPORT_FORMATS: ReportExportFormat[] = ['xlsx', 'csv']

@injectable()
export class ReportController {
	constructor(
		@inject(TYPES.IReportService)
		private reportService: IReportService
	) {}

	private parseTimesheetReportFilter(req: Request): TimesheetReportFilterOptions {
		return {
			startDate: req.query.startDate as string,
			endDate: req.query.endDate as string,
			projectId: req.query.projectId
				? parseInt(req.query.projectId as string, 10)
				: undefined,
			userId: req.query.userId
				? parseInt(req.query.userId as string, 10)
				: undefined,
			isApproved:
				req.query.isApproved !== undefined
					? req.query.isApproved === 'true'
					: undefined,
			page: parseInt(req.query.page as string, 10) || 1,
			perPage:
				parseInt(req.query.pageSize as string, 10) ||
				DEFAULT_TIMESHEET_REPORT_PAGE_SIZE,
		}
	}

	private parseUserRolesSummaryFilter(req: Request): UserRolesSummaryFilterOptions {
		return {
			startDate: req.query.startDate as string,
			endDate: req.query.endDate as string,
			projectId: req.query.projectId
				? parseInt(req.query.projectId as string, 10)
				: undefined,
		}
	}

	private parseMonthlyCostRevenueFilter(
		req: Request
	): MonthlyCostRevenueFilterOptions {
		return {
			year: parseInt(req.query.year as string, 10),
			month: parseInt(req.query.month as string, 10),
			projectId: req.query.projectId
				? parseInt(req.query.projectId as string, 10)
				: undefined,
			currencyId: req.query.currencyId
				? parseInt(req.query.currencyId as string, 10)
				: undefined,
		}
	}

	/** `format` is validated here (rather than in the service) since it's a
	 * transport-level concern (which of two file encodings to send back), not
	 * a business rule. Defaults to `xlsx` per the API spec. */
	private parseExportFormat(req: Request): ReportExportFormat {
		const format = (req.query.format as string | undefined) ?? 'xlsx'
		if (!SUPPORTED_EXPORT_FORMATS.includes(format as ReportExportFormat)) {
			throw new AppException(
				`format must be one of: ${SUPPORTED_EXPORT_FORMATS.join(', ')}`,
				400
			)
		}
		return format as ReportExportFormat
	}

	/** Streams a generated report file back as the raw response body — an
	 * intentional, spec-mandated deviation from this codebase's standard JSON
	 * response envelope (`responseHandler`), matching the API spec's
	 * documented `Content-Type`/`Content-Disposition` file-download shape for
	 * every `Export*` endpoint. */
	private sendFile(
		res: Response,
		file: { fileName: string; contentType: string; buffer: Buffer }
	): void {
		res.setHeader('Content-Type', file.contentType)
		res.setHeader(
			'Content-Disposition',
			`attachment; filename="${file.fileName}"`
		)
		res.status(200).send(file.buffer)
	}

	public generateTimesheetReport = asyncHandler(
		async (req: Request, res: Response) => {
			const result = await this.reportService.generateTimesheetReport(
				this.parseTimesheetReportFilter(req)
			)
			responseHandler(res, 200, {
				message: 'Timesheet report generated successfully',
				data: result,
			})
		}
	)

	public exportTimesheetReport = asyncHandler(
		async (req: Request, res: Response) => {
			const file = await this.reportService.exportTimesheetReport(
				this.parseTimesheetReportFilter(req),
				this.parseExportFormat(req)
			)
			this.sendFile(res, file)
		}
	)

	public generateUserRolesSummary = asyncHandler(
		async (req: Request, res: Response) => {
			const result = await this.reportService.generateUserRolesSummary(
				this.parseUserRolesSummaryFilter(req)
			)
			responseHandler(res, 200, {
				message: 'User roles summary generated successfully',
				data: result,
			})
		}
	)

	public exportUserRolesSummary = asyncHandler(
		async (req: Request, res: Response) => {
			const file = await this.reportService.exportUserRolesSummary(
				this.parseUserRolesSummaryFilter(req),
				this.parseExportFormat(req)
			)
			this.sendFile(res, file)
		}
	)

	public generateMonthlyCostRevenue = asyncHandler(
		async (req: Request, res: Response) => {
			const result = await this.reportService.generateMonthlyCostRevenue(
				this.parseMonthlyCostRevenueFilter(req)
			)
			responseHandler(res, 200, {
				message: 'Monthly cost/revenue report generated successfully',
				data: result,
			})
		}
	)

	public exportMonthlyCostRevenue = asyncHandler(
		async (req: Request, res: Response) => {
			const file = await this.reportService.exportMonthlyCostRevenue(
				this.parseMonthlyCostRevenueFilter(req),
				this.parseExportFormat(req)
			)
			this.sendFile(res, file)
		}
	)
}
