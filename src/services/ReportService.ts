import { injectable, inject } from 'inversify'
import { Op, WhereOptions } from 'sequelize'
import { IReportService } from '../interfaces/service/IReportService'
import { IReportRepository } from '../interfaces/repository/IReportRepository'
import { IProjectRepository } from '../interfaces/repository/IProjectRepository'
import { IUserRepository } from '../interfaces/repository/IUserRepository'
import { IProjectResourceAssignmentRepository } from '../interfaces/repository/IProjectResourceAssignmentRepository'
import { IRateCardRepository } from '../interfaces/repository/IRateCardRepository'
import { IExchangeRateRepository } from '../interfaces/repository/IExchangeRateRepository'
import { ICurrencyRepository } from '../interfaces/repository/ICurrencyRepository'
import { TimesheetEntry } from '../models/TimesheetEntry'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { ProjectResourceAssignment } from '../models/ProjectResourceAssignment'
import { Currency } from '../models/Currency'
import { TYPES } from '../containers/inversifyTypes'
import AppException from '../exceptions/AppException'
import {
	buildCsvBuffer,
	buildXlsxBuffer,
	CSV_CONTENT_TYPE,
	ExportColumn,
	XLSX_CONTENT_TYPE,
} from '../utils/reportExporter'
import {
	MonthlyCostRevenueBreakdownDTO,
	MonthlyCostRevenueFilterOptions,
	MonthlyCostRevenueProjectDTO,
	MonthlyCostRevenueResultDTO,
	ReportExportFileDTO,
	ReportExportFormat,
	ReportProjectSummaryDTO,
	TimesheetReportFilterOptions,
	TimesheetReportItemDTO,
	TimesheetReportResultDTO,
	UserRolesSummaryFilterOptions,
	UserRolesSummaryItemDTO,
	UserRolesSummaryResultDTO,
} from '../types/reportTypes'

const TIMESHEET_REPORT_INCLUDE = [
	{ model: User, as: 'user', attributes: ['id', 'name'] },
	{ model: Project, as: 'project', attributes: ['id', 'code', 'name'] },
]

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Every `Export*` endpoint materialises its entire filtered result set (not
 * just one page) into memory to build the file — reasonable for a reporting
 * period like "a month", but unbounded in principle if a caller passes a huge
 * date range. Capped here rather than left unbounded; flagged for the
 * security/QA review pass as a deliberate, minimal guard rather than a fully
 * streamed export (which would be a larger follow-up piece of work).
 */
const MAX_EXPORT_ROWS = 20000

interface AssignmentContext {
	resourceRoleTypeId: number
	resourceRoleTypeName: string
	countryId: number | null
}

@injectable()
export class ReportService implements IReportService {
	constructor(
		@inject(TYPES.IReportRepository)
		private reportRepository: IReportRepository,
		@inject(TYPES.IProjectRepository)
		private projectRepository: IProjectRepository,
		@inject(TYPES.IUserRepository)
		private userRepository: IUserRepository,
		@inject(TYPES.IProjectResourceAssignmentRepository)
		private projectResourceAssignmentRepository: IProjectResourceAssignmentRepository,
		@inject(TYPES.IRateCardRepository)
		private rateCardRepository: IRateCardRepository,
		@inject(TYPES.IExchangeRateRepository)
		private exchangeRateRepository: IExchangeRateRepository,
		@inject(TYPES.ICurrencyRepository)
		private currencyRepository: ICurrencyRepository
	) {}

	// -------------------------------------------------------------------
	// Shared validation helpers
	// -------------------------------------------------------------------

	private assertDateOnly(value: string, fieldName: string): void {
		if (!DATE_ONLY_PATTERN.test(value)) {
			throw new AppException(`${fieldName} must be a date in YYYY-MM-DD format`, 400)
		}
	}

	private assertDateRange(startDate: string, endDate: string): void {
		this.assertDateOnly(startDate, 'startDate')
		this.assertDateOnly(endDate, 'endDate')
		if (startDate > endDate) {
			throw new AppException('startDate must be on or before endDate', 400)
		}
	}

	private async assertProjectExists(projectId: number): Promise<void> {
		const project = await this.projectRepository.findByPk(projectId)
		if (!project) {
			throw new AppException('Project not found', 404)
		}
	}

	private roundMoney(value: number): number {
		return Math.round(value * 100) / 100
	}

	// -------------------------------------------------------------------
	// GenerateTimesheetReport / ExportTimesheetReport (RP-01, RP-02)
	// -------------------------------------------------------------------

	private buildTimesheetReportWhere(
		options: Pick<
			TimesheetReportFilterOptions,
			'startDate' | 'endDate' | 'projectId' | 'userId' | 'isApproved'
		>
	): WhereOptions<TimesheetEntry> {
		return {
			entryDate: { [Op.between]: [options.startDate, options.endDate] },
			...(options.projectId !== undefined && { projectId: options.projectId }),
			...(options.userId !== undefined && { userId: options.userId }),
			...(options.isApproved !== undefined && { isApproved: options.isApproved }),
		}
	}

	/** Associations are only guaranteed present when the query that produced
	 * `entry` requested them via `include` (`TIMESHEET_REPORT_INCLUDE`,
	 * used by every method below) — guarded rather than asserted so a future
	 * call site that forgets the `include` fails loudly instead of
	 * serializing `undefined` (same convention as
	 * `TimesheetEntryService.toDetailDTO`). */
	private toTimesheetReportItemDTO(entry: TimesheetEntry): TimesheetReportItemDTO {
		const { user, project } = entry
		if (!user || !project) {
			throw new AppException('Failed to load timesheet report details', 500)
		}

		return {
			// `employeeId` has no backing column yet — see the doc-comment on
			// `ReportUserSummaryDTO.employeeId`.
			user: { id: user.id, fullName: user.name, employeeId: null },
			project: { id: project.id, code: project.code, name: project.name },
			entryDate: entry.entryDate,
			hours: Number(entry.hours),
			taskDescription: entry.description,
			isApproved: entry.isApproved,
		}
	}

	private async validateTimesheetReportFilter(
		options: TimesheetReportFilterOptions
	): Promise<void> {
		this.assertDateRange(options.startDate, options.endDate)

		if (options.projectId !== undefined) {
			await this.assertProjectExists(options.projectId)
		}
		if (options.userId !== undefined) {
			const user = await this.userRepository.findByPk(options.userId)
			if (!user) {
				throw new AppException('User not found', 404)
			}
		}
	}

	public async generateTimesheetReport(
		options: TimesheetReportFilterOptions
	): Promise<TimesheetReportResultDTO> {
		await this.validateTimesheetReportFilter(options)

		const where = this.buildTimesheetReportWhere(options)

		const [paginated, totalHours] = await Promise.all([
			this.reportRepository.findAndPaginate(options.page, options.perPage, {
				where,
				include: TIMESHEET_REPORT_INCLUDE,
				order: [
					['entryDate', 'DESC'],
					['id', 'DESC'],
				],
			}),
			this.reportRepository.sumHours(where),
		])

		return {
			reportGeneratedAt: new Date(),
			startDate: options.startDate,
			endDate: options.endDate,
			totalHours: Number(totalHours),
			items: paginated.data.map((entry) => this.toTimesheetReportItemDTO(entry)),
			totalCount: paginated.totalResults ?? 0,
		}
	}

	public async exportTimesheetReport(
		options: TimesheetReportFilterOptions,
		format: ReportExportFormat
	): Promise<ReportExportFileDTO> {
		await this.validateTimesheetReportFilter(options)

		const where = this.buildTimesheetReportWhere(options)

		const rowCount = await this.reportRepository.count({ where })
		if (rowCount > MAX_EXPORT_ROWS) {
			throw new AppException(
				`Too many rows to export (${rowCount}). Narrow the date range or filters (max ${MAX_EXPORT_ROWS}).`,
				400
			)
		}

		const entries = await this.reportRepository.find({
			where,
			include: TIMESHEET_REPORT_INCLUDE,
			order: [
				['entryDate', 'DESC'],
				['id', 'DESC'],
			],
		})
		const items = entries.map((entry) => this.toTimesheetReportItemDTO(entry))

		const columns: ExportColumn<TimesheetReportItemDTO>[] = [
			{ header: 'Entry Date', value: (row) => row.entryDate },
			{ header: 'User', value: (row) => row.user.fullName },
			{ header: 'Project Code', value: (row) => row.project.code },
			{ header: 'Project Name', value: (row) => row.project.name },
			{ header: 'Hours', value: (row) => row.hours },
			{ header: 'Task Description', value: (row) => row.taskDescription },
			{ header: 'Approved', value: (row) => (row.isApproved ? 'Yes' : 'No') },
		]

		return this.buildExportFile(
			`timesheet-report-${options.startDate.slice(0, 7)}`,
			'Timesheet Report',
			columns,
			items,
			format
		)
	}

	// -------------------------------------------------------------------
	// GenerateUserRolesSummary / ExportUserRolesSummary (RP-03)
	// -------------------------------------------------------------------

	/**
	 * Resolves each `(projectId, userId)` pair's current resource role type
	 * (and the user's country, needed by `GenerateMonthlyCostRevenue`) via
	 * the *currently* active `ProjectResourceAssignment` — this codebase has
	 * no historical/point-in-time record of "what role was this user
	 * assigned when they logged this entry" (assignments are mutable
	 * current-state rows, same as `GetProjectAssignments`). If a user's role
	 * changes, or their assignment is later removed, past report periods
	 * will reflect the *current* role, or fall into the "Unassigned" bucket
	 * — a known, documented limitation, not a bug. Making this
	 * point-in-time-accurate would require snapshotting the role onto
	 * `TimesheetEntry` at creation time (a Module 4 schema change), which is
	 * out of scope for this Reports feature.
	 */
	private async buildAssignmentContextMap(
		projectIds: number[]
	): Promise<Map<string, AssignmentContext>> {
		const assignments =
			await this.projectResourceAssignmentRepository.findActiveByProjectIds(
				projectIds
			)

		const map = new Map<string, AssignmentContext>()
		for (const assignment of assignments) {
			const context = this.toAssignmentContext(assignment)
			if (context) {
				map.set(`${assignment.projectId}:${assignment.userId}`, context)
			}
		}
		return map
	}

	private toAssignmentContext(
		assignment: ProjectResourceAssignment
	): AssignmentContext | null {
		const { user, resourceRoleType } = assignment
		if (!user || !resourceRoleType) {
			throw new AppException('Failed to load assignment details', 500)
		}
		return {
			resourceRoleTypeId: resourceRoleType.id,
			resourceRoleTypeName: resourceRoleType.name,
			countryId: user.countryId,
		}
	}

	public async generateUserRolesSummary(
		options: UserRolesSummaryFilterOptions
	): Promise<UserRolesSummaryResultDTO> {
		this.assertDateRange(options.startDate, options.endDate)
		if (options.projectId !== undefined) {
			await this.assertProjectExists(options.projectId)
		}

		const where: WhereOptions<TimesheetEntry> = {
			entryDate: { [Op.between]: [options.startDate, options.endDate] },
			...(options.projectId !== undefined && { projectId: options.projectId }),
		}

		const grouped =
			await this.reportRepository.sumHoursGroupedByUserAndProject(where)

		if (grouped.length === 0) {
			return {
				startDate: options.startDate,
				endDate: options.endDate,
				summary: [],
				grandTotalHours: 0,
			}
		}

		const projectIds = [...new Set(grouped.map((row) => row.projectId))]
		const assignmentContextByKey = await this.buildAssignmentContextMap(projectIds)

		interface Bucket {
			resourceRoleTypeId: number | null
			resourceRoleTypeName: string
			totalHours: number
			userIds: Set<number>
		}
		const buckets = new Map<string, Bucket>()

		for (const row of grouped) {
			const context = assignmentContextByKey.get(`${row.projectId}:${row.userId}`)
			const bucketKey = context ? String(context.resourceRoleTypeId) : 'unassigned'

			const bucket = buckets.get(bucketKey) ?? {
				resourceRoleTypeId: context?.resourceRoleTypeId ?? null,
				resourceRoleTypeName: context?.resourceRoleTypeName ?? 'Unassigned',
				totalHours: 0,
				userIds: new Set<number>(),
			}
			bucket.totalHours += Number(row.totalHours)
			bucket.userIds.add(row.userId)
			buckets.set(bucketKey, bucket)
		}

		const summary: UserRolesSummaryItemDTO[] = Array.from(buckets.values())
			.map((bucket) => ({
				resourceRoleType: {
					id: bucket.resourceRoleTypeId,
					name: bucket.resourceRoleTypeName,
				},
				totalHours: bucket.totalHours,
				userCount: bucket.userIds.size,
			}))
			.sort((a, b) => b.totalHours - a.totalHours)

		return {
			startDate: options.startDate,
			endDate: options.endDate,
			summary,
			grandTotalHours: summary.reduce((sum, item) => sum + item.totalHours, 0),
		}
	}

	public async exportUserRolesSummary(
		options: UserRolesSummaryFilterOptions,
		format: ReportExportFormat
	): Promise<ReportExportFileDTO> {
		const result = await this.generateUserRolesSummary(options)

		const columns: ExportColumn<UserRolesSummaryItemDTO>[] = [
			{ header: 'Resource Role Type', value: (row) => row.resourceRoleType.name },
			{ header: 'Total Hours', value: (row) => row.totalHours },
			{ header: 'User Count', value: (row) => row.userCount },
		]

		return this.buildExportFile(
			`user-roles-summary-${options.startDate.slice(0, 7)}`,
			'User Roles Summary',
			columns,
			result.summary,
			format
		)
	}

	// -------------------------------------------------------------------
	// GenerateMonthlyCostRevenue / ExportMonthlyCostRevenue (RP-04)
	// -------------------------------------------------------------------

	private assertValidMonth(year: number, month: number): void {
		if (!Number.isInteger(year) || year < 2000 || year > 2100) {
			throw new AppException('year must be a valid calendar year', 400)
		}
		if (!Number.isInteger(month) || month < 1 || month > 12) {
			throw new AppException('month must be between 1 and 12', 400)
		}
	}

	private getMonthDateRange(year: number, month: number): {
		monthStart: string
		monthEnd: string
	} {
		const pad = (value: number) => String(value).padStart(2, '0')
		// `Date.UTC(year, month, 0)` — the "day 0" of the (0-based) month
		// after ours — resolves to the last calendar day of *our* (1-based)
		// `month`, correctly accounting for month length/leap years.
		const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
		return {
			monthStart: `${year}-${pad(month)}-01`,
			monthEnd: `${year}-${pad(month)}-${pad(lastDay)}`,
		}
	}

	private async resolveTargetCurrency(currencyId?: number): Promise<Currency> {
		if (currencyId !== undefined) {
			const currency = await this.currencyRepository.findByPk(currencyId)
			if (!currency) {
				throw new AppException('Currency not found', 404)
			}
			return currency
		}

		const baseCurrency = await this.currencyRepository.findActiveBaseCurrency()
		if (!baseCurrency) {
			throw new AppException(
				'No active base currency is configured; pass an explicit currencyId',
				400
			)
		}
		return baseCurrency
	}

	public async generateMonthlyCostRevenue(
		options: MonthlyCostRevenueFilterOptions
	): Promise<MonthlyCostRevenueResultDTO> {
		this.assertValidMonth(options.year, options.month)
		if (options.projectId !== undefined) {
			await this.assertProjectExists(options.projectId)
		}

		const targetCurrency = await this.resolveTargetCurrency(options.currencyId)
		const { monthStart, monthEnd } = this.getMonthDateRange(
			options.year,
			options.month
		)

		const where: WhereOptions<TimesheetEntry> = {
			entryDate: { [Op.between]: [monthStart, monthEnd] },
			...(options.projectId !== undefined && { projectId: options.projectId }),
		}

		const grouped =
			await this.reportRepository.sumHoursGroupedByUserAndProject(where)

		const currencySummary = {
			id: targetCurrency.id,
			code: targetCurrency.code,
			symbol: targetCurrency.symbol,
		}

		if (grouped.length === 0) {
			return {
				year: options.year,
				month: options.month,
				currency: currencySummary,
				projects: [],
			}
		}

		const projectIds = [...new Set(grouped.map((row) => row.projectId))]
		const [projects, assignmentContextByKey] = await Promise.all([
			this.projectRepository.find({
				where: { id: { [Op.in]: projectIds } },
				attributes: ['id', 'code', 'name'],
			}),
			this.buildAssignmentContextMap(projectIds),
		])
		const projectById = new Map(projects.map((project) => [project.id, project]))

		// Memoize rate card / exchange rate lookups — many entries share the
		// same (country, role type) or source currency within a single report.
		const rateCardCache = new Map<
			string,
			{ costRate: number; billingRate: number; currencyId: number } | null
		>()
		const factorCache = new Map<number, number>()

		const getRate = async (
			countryId: number,
			resourceRoleTypeId: number
		): Promise<{ costRate: number; billingRate: number; currencyId: number } | null> => {
			const cacheKey = `${countryId}:${resourceRoleTypeId}`
			if (rateCardCache.has(cacheKey)) {
				return rateCardCache.get(cacheKey) ?? null
			}

			const rateCard = await this.rateCardRepository.findEffectiveRateCard(
				countryId,
				resourceRoleTypeId,
				monthEnd
			)
			const resolved = rateCard
				? {
						costRate: Number(rateCard.costRate),
						billingRate: Number(rateCard.billingRate),
						currencyId: rateCard.currencyId,
					}
				: null
			rateCardCache.set(cacheKey, resolved)
			return resolved
		}

		const getConversionFactor = async (
			fromCurrencyId: number
		): Promise<number> => {
			if (fromCurrencyId === targetCurrency.id) {
				return 1
			}
			if (factorCache.has(fromCurrencyId)) {
				return factorCache.get(fromCurrencyId) as number
			}

			const exchangeRate = await this.exchangeRateRepository.findLatestActiveRate(
				fromCurrencyId,
				targetCurrency.id,
				monthEnd
			)
			if (!exchangeRate) {
				throw new AppException(
					`No active exchange rate found to convert into ${targetCurrency.code} as of ${monthEnd}`,
					400
				)
			}

			const factor = Number(exchangeRate.rate)
			factorCache.set(fromCurrencyId, factor)
			return factor
		}

		interface RoleBucket {
			resourceRoleType: string
			hours: number
			costRate: number | null
			billingRate: number | null
			cost: number
			revenue: number
		}
		const projectBuckets = new Map<number, Map<string, RoleBucket>>()

		for (const row of grouped) {
			const context = assignmentContextByKey.get(`${row.projectId}:${row.userId}`)
			const hours = Number(row.totalHours)

			const roleKey = context ? String(context.resourceRoleTypeId) : 'unassigned'
			const roleName = context?.resourceRoleTypeName ?? 'Unassigned'

			const rate =
				context?.countryId != null
					? await getRate(context.countryId, context.resourceRoleTypeId)
					: null

			let costRate: number | null = null
			let billingRate: number | null = null
			let cost = 0
			let revenue = 0
			if (rate) {
				const factor = await getConversionFactor(rate.currencyId)
				costRate = this.roundMoney(rate.costRate * factor)
				billingRate = this.roundMoney(rate.billingRate * factor)
				cost = hours * costRate
				revenue = hours * billingRate
			}

			const roleBuckets =
				projectBuckets.get(row.projectId) ?? new Map<string, RoleBucket>()
			const bucket = roleBuckets.get(roleKey) ?? {
				resourceRoleType: roleName,
				hours: 0,
				costRate,
				billingRate,
				cost: 0,
				revenue: 0,
			}
			bucket.hours += hours
			bucket.cost += cost
			bucket.revenue += revenue
			roleBuckets.set(roleKey, bucket)
			projectBuckets.set(row.projectId, roleBuckets)
		}

		const projectDTOs: MonthlyCostRevenueProjectDTO[] = []
		for (const [projectId, roleBuckets] of projectBuckets) {
			const project = projectById.get(projectId)
			if (!project) {
				throw new AppException('Failed to load project details', 500)
			}
			const projectSummary: ReportProjectSummaryDTO = {
				id: project.id,
				code: project.code,
				name: project.name,
			}

			const breakdown: MonthlyCostRevenueBreakdownDTO[] = Array.from(
				roleBuckets.values()
			)
				.map((bucket) => ({
					resourceRoleType: bucket.resourceRoleType,
					hours: bucket.hours,
					costRate: bucket.costRate,
					billingRate: bucket.billingRate,
					cost: this.roundMoney(bucket.cost),
					revenue: this.roundMoney(bucket.revenue),
				}))
				.sort((a, b) => a.resourceRoleType.localeCompare(b.resourceRoleType))

			const totalHours = breakdown.reduce((sum, item) => sum + item.hours, 0)
			const totalCost = this.roundMoney(
				breakdown.reduce((sum, item) => sum + item.cost, 0)
			)
			const totalRevenue = this.roundMoney(
				breakdown.reduce((sum, item) => sum + item.revenue, 0)
			)

			projectDTOs.push({
				project: projectSummary,
				totalHours,
				totalCost,
				totalRevenue,
				margin: this.roundMoney(totalRevenue - totalCost),
				breakdown,
			})
		}
		projectDTOs.sort((a, b) => a.project.code.localeCompare(b.project.code))

		return {
			year: options.year,
			month: options.month,
			currency: currencySummary,
			projects: projectDTOs,
		}
	}

	public async exportMonthlyCostRevenue(
		options: MonthlyCostRevenueFilterOptions,
		format: ReportExportFormat
	): Promise<ReportExportFileDTO> {
		const result = await this.generateMonthlyCostRevenue(options)

		interface ExportRow {
			project: ReportProjectSummaryDTO
			breakdown: MonthlyCostRevenueBreakdownDTO
		}
		const rows: ExportRow[] = result.projects.flatMap((project) =>
			project.breakdown.map((breakdown) => ({ project: project.project, breakdown }))
		)

		const columns: ExportColumn<ExportRow>[] = [
			{ header: 'Project Code', value: (row) => row.project.code },
			{ header: 'Project Name', value: (row) => row.project.name },
			{ header: 'Resource Role Type', value: (row) => row.breakdown.resourceRoleType },
			{ header: 'Hours', value: (row) => row.breakdown.hours },
			{ header: 'Cost Rate', value: (row) => row.breakdown.costRate ?? '' },
			{ header: 'Billing Rate', value: (row) => row.breakdown.billingRate ?? '' },
			{ header: 'Cost', value: (row) => row.breakdown.cost },
			{ header: 'Revenue', value: (row) => row.breakdown.revenue },
			{ header: 'Currency', value: () => result.currency.code },
		]

		const pad = (value: number) => String(value).padStart(2, '0')
		return this.buildExportFile(
			`monthly-cost-revenue-${options.year}-${pad(options.month)}`,
			'Monthly Cost Revenue',
			columns,
			rows,
			format
		)
	}

	// -------------------------------------------------------------------
	// Export plumbing shared by all three `Export*` methods
	// -------------------------------------------------------------------

	private async buildExportFile<T>(
		fileNameStem: string,
		sheetName: string,
		columns: ExportColumn<T>[],
		rows: T[],
		format: ReportExportFormat
	): Promise<ReportExportFileDTO> {
		if (format === 'csv') {
			return {
				fileName: `${fileNameStem}.csv`,
				contentType: CSV_CONTENT_TYPE,
				buffer: buildCsvBuffer(columns, rows),
			}
		}

		return {
			fileName: `${fileNameStem}.xlsx`,
			contentType: XLSX_CONTENT_TYPE,
			buffer: await buildXlsxBuffer(sheetName, columns, rows),
		}
	}
}
