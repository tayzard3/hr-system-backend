import { IReportRepository } from '../../interfaces/repository/IReportRepository'
import { IProjectRepository } from '../../interfaces/repository/IProjectRepository'
import { IUserRepository } from '../../interfaces/repository/IUserRepository'
import { IProjectResourceAssignmentRepository } from '../../interfaces/repository/IProjectResourceAssignmentRepository'
import { IRateCardRepository } from '../../interfaces/repository/IRateCardRepository'
import { IExchangeRateRepository } from '../../interfaces/repository/IExchangeRateRepository'
import { ICurrencyRepository } from '../../interfaces/repository/ICurrencyRepository'
import { ReportService } from '../ReportService'

// Every unit test below mocks all seven repository dependencies directly
// (no real DB/model access) — same convention as ExchangeRateService.test.ts
// / RateCardService.test.ts.
describe('ReportService', () => {
	let reportRepository: jest.Mocked<IReportRepository>
	let projectRepository: jest.Mocked<IProjectRepository>
	let userRepository: jest.Mocked<IUserRepository>
	let projectResourceAssignmentRepository: jest.Mocked<IProjectResourceAssignmentRepository>
	let rateCardRepository: jest.Mocked<IRateCardRepository>
	let exchangeRateRepository: jest.Mocked<IExchangeRateRepository>
	let currencyRepository: jest.Mocked<ICurrencyRepository>
	let reportService: ReportService

	const baseRepoMock = () => ({
		findByPk: jest.fn(),
		find: jest.fn(),
		findAndPaginate: jest.fn(),
		findOne: jest.fn(),
		findOrCreate: jest.fn(),
		delete: jest.fn(),
		update: jest.fn(),
		create: jest.fn(),
		bulkCreate: jest.fn(),
		count: jest.fn(),
		upsert: jest.fn(),
		increasement: jest.fn(),
		decreasement: jest.fn(),
		query: jest.fn(),
	})

	const project1 = { id: 1, code: 'PROJ-001', name: 'Client Portal v2' }
	const project2 = { id: 2, code: 'PROJ-002', name: 'Internal Tools' }
	const user1 = { id: 10, name: 'John Doe' }
	const sgd = { id: 1, code: 'SGD', symbol: 'S$', isBaseCurrency: true }
	const usd = { id: 2, code: 'USD', symbol: '$', isBaseCurrency: false }

	const timesheetEntryRow = (overrides: Record<string, unknown> = {}) => ({
		id: 100,
		userId: 10,
		projectId: 1,
		entryDate: '2026-06-15',
		hours: '7.50',
		description: 'Implemented login flow.',
		isApproved: true,
		user: user1,
		project: project1,
		...overrides,
	})

	beforeEach(() => {
		reportRepository = {
			...baseRepoMock(),
			sumHours: jest.fn(),
			sumHoursGroupedByUserAndProject: jest.fn(),
		} as unknown as jest.Mocked<IReportRepository>

		projectRepository = baseRepoMock() as unknown as jest.Mocked<IProjectRepository>
		userRepository = baseRepoMock() as unknown as jest.Mocked<IUserRepository>

		projectResourceAssignmentRepository = {
			...baseRepoMock(),
			findActiveAssignment: jest.fn(),
			findActiveByProjectIds: jest.fn(),
		} as unknown as jest.Mocked<IProjectResourceAssignmentRepository>

		rateCardRepository = {
			...baseRepoMock(),
			findActiveByCountryRoleAndEffectiveDate: jest.fn(),
			findEffectiveRateCard: jest.fn(),
		} as unknown as jest.Mocked<IRateCardRepository>

		exchangeRateRepository = {
			...baseRepoMock(),
			findActiveByPairAndEffectiveDate: jest.fn(),
			findLatestActiveRate: jest.fn(),
		} as unknown as jest.Mocked<IExchangeRateRepository>

		currencyRepository = {
			...baseRepoMock(),
			findByCode: jest.fn(),
			findActiveBaseCurrency: jest.fn(),
		} as unknown as jest.Mocked<ICurrencyRepository>

		reportService = new ReportService(
			reportRepository,
			projectRepository,
			userRepository,
			projectResourceAssignmentRepository,
			rateCardRepository,
			exchangeRateRepository,
			currencyRepository
		)
	})

	describe('generateTimesheetReport', () => {
		const validOptions = {
			startDate: '2026-06-01',
			endDate: '2026-06-30',
			page: 1,
			perPage: 100,
		}

		it('throws 400 when startDate is not in YYYY-MM-DD format', async () => {
			await expect(
				reportService.generateTimesheetReport({
					...validOptions,
					startDate: '06-01-2026',
				})
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('throws 400 when startDate is after endDate', async () => {
			await expect(
				reportService.generateTimesheetReport({
					...validOptions,
					startDate: '2026-06-30',
					endDate: '2026-06-01',
				})
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('throws 404 when the filtered projectId does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(
				reportService.generateTimesheetReport({
					...validOptions,
					projectId: 999,
				})
			).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 })
		})

		it('throws 404 when the filtered userId does not exist', async () => {
			userRepository.findByPk.mockResolvedValue(null)

			await expect(
				reportService.generateTimesheetReport({
					...validOptions,
					userId: 999,
				})
			).rejects.toMatchObject({ message: 'User not found', statusCode: 404 })
		})

		it('returns items, totalHours and totalCount from the repository', async () => {
			reportRepository.findAndPaginate.mockResolvedValue({
				data: [timesheetEntryRow()],
				perPage: 100,
				totalResults: 1,
				total: 1,
			} as never)
			reportRepository.sumHours.mockResolvedValue('7.50')

			const result = await reportService.generateTimesheetReport(validOptions)

			expect(result.totalHours).toBe(7.5)
			expect(result.totalCount).toBe(1)
			expect(result.items).toEqual([
				{
					user: { id: 10, fullName: 'John Doe', employeeId: null },
					project: { id: 1, code: 'PROJ-001', name: 'Client Portal v2' },
					entryDate: '2026-06-15',
					hours: 7.5,
					taskDescription: 'Implemented login flow.',
					isApproved: true,
				},
			])
			expect(result.reportGeneratedAt).toBeInstanceOf(Date)
		})

		it('throws 500 if an entry is returned without its user/project include', async () => {
			reportRepository.findAndPaginate.mockResolvedValue({
				data: [timesheetEntryRow({ user: undefined })],
				perPage: 100,
				total: 1,
			} as never)
			reportRepository.sumHours.mockResolvedValue('7.50')

			await expect(
				reportService.generateTimesheetReport(validOptions)
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('exportTimesheetReport', () => {
		const validOptions = {
			startDate: '2026-06-01',
			endDate: '2026-06-30',
			page: 1,
			perPage: 100,
		}

		it('throws 400 when the filtered row count exceeds the export cap', async () => {
			reportRepository.count.mockResolvedValue(20001)

			await expect(
				reportService.exportTimesheetReport(validOptions, 'csv')
			).rejects.toMatchObject({ statusCode: 400 })
			expect(reportRepository.find).not.toHaveBeenCalled()
		})

		it('builds a csv export file with the expected name and content type', async () => {
			reportRepository.count.mockResolvedValue(1)
			reportRepository.find.mockResolvedValue([timesheetEntryRow()] as never)

			const file = await reportService.exportTimesheetReport(validOptions, 'csv')

			expect(file.fileName).toBe('timesheet-report-2026-06.csv')
			expect(file.contentType).toBe('text/csv')
			expect(file.buffer.toString('utf-8')).toContain('Implemented login flow.')
		})

		it('builds an xlsx export file with the expected name and content type', async () => {
			reportRepository.count.mockResolvedValue(1)
			reportRepository.find.mockResolvedValue([timesheetEntryRow()] as never)

			const file = await reportService.exportTimesheetReport(validOptions, 'xlsx')

			expect(file.fileName).toBe('timesheet-report-2026-06.xlsx')
			expect(file.contentType).toBe(
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
			expect(file.buffer.length).toBeGreaterThan(0)
		})
	})

	describe('generateUserRolesSummary', () => {
		const validOptions = { startDate: '2026-06-01', endDate: '2026-06-30' }

		it('throws 400 on an invalid date range', async () => {
			await expect(
				reportService.generateUserRolesSummary({
					startDate: '2026-06-30',
					endDate: '2026-06-01',
				})
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('returns an empty summary when there are no logged hours', async () => {
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([])

			const result = await reportService.generateUserRolesSummary(validOptions)

			expect(result).toEqual({
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				summary: [],
				grandTotalHours: 0,
			})
		})

		it('buckets hours by resource role type and falls back to "Unassigned" when no active assignment exists', async () => {
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([
				{ userId: 10, projectId: 1, totalHours: '20.00' },
				{ userId: 11, projectId: 1, totalHours: '5.00' },
			] as never)
			projectResourceAssignmentRepository.findActiveByProjectIds.mockResolvedValue([
				{
					projectId: 1,
					userId: 10,
					user: { id: 10, countryId: 1 },
					resourceRoleType: { id: 5, name: 'Senior Developer' },
				},
			] as never)

			const result = await reportService.generateUserRolesSummary(validOptions)

			expect(result.grandTotalHours).toBe(25)
			expect(result.summary).toEqual(
				expect.arrayContaining([
					{
						resourceRoleType: { id: 5, name: 'Senior Developer' },
						totalHours: 20,
						userCount: 1,
					},
					{
						resourceRoleType: { id: null, name: 'Unassigned' },
						totalHours: 5,
						userCount: 1,
					},
				])
			)
		})
	})

	describe('generateMonthlyCostRevenue', () => {
		it('throws 400 for an out-of-range month', async () => {
			await expect(
				reportService.generateMonthlyCostRevenue({ year: 2026, month: 13 })
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('throws 404 when the filtered projectId does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(
				reportService.generateMonthlyCostRevenue({
					year: 2026,
					month: 6,
					projectId: 999,
				})
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('throws 400 when no explicit currencyId is given and no active base currency is configured', async () => {
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(null)

			await expect(
				reportService.generateMonthlyCostRevenue({ year: 2026, month: 6 })
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('throws 404 when an explicit currencyId does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				reportService.generateMonthlyCostRevenue({
					year: 2026,
					month: 6,
					currencyId: 999,
				})
			).rejects.toMatchObject({ message: 'Currency not found', statusCode: 404 })
		})

		it('returns an empty project list when no hours were logged that month', async () => {
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([])

			const result = await reportService.generateMonthlyCostRevenue({
				year: 2026,
				month: 6,
			})

			expect(result.projects).toEqual([])
			expect(result.currency).toEqual({ id: 1, code: 'SGD', symbol: 'S$' })
		})

		it('computes cost/revenue/margin per project using the effective rate card, with no currency conversion needed when the rate card is already in the target currency', async () => {
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([
				{ userId: 10, projectId: 1, totalHours: '10.00' },
			] as never)
			projectRepository.find.mockResolvedValue([project1] as never)
			projectResourceAssignmentRepository.findActiveByProjectIds.mockResolvedValue([
				{
					projectId: 1,
					userId: 10,
					user: { id: 10, countryId: 1 },
					resourceRoleType: { id: 5, name: 'Senior Developer' },
				},
			] as never)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue({
				costRate: '120.00',
				billingRate: '150.00',
				currencyId: 1,
			} as never)

			const result = await reportService.generateMonthlyCostRevenue({
				year: 2026,
				month: 6,
			})

			expect(exchangeRateRepository.findLatestActiveRate).not.toHaveBeenCalled()
			expect(result.projects).toEqual([
				{
					project: project1,
					totalHours: 10,
					totalCost: 1200,
					totalRevenue: 1500,
					margin: 300,
					breakdown: [
						{
							resourceRoleType: 'Senior Developer',
							hours: 10,
							costRate: 120,
							billingRate: 150,
							cost: 1200,
							revenue: 1500,
						},
					],
				},
			])
		})

		it('converts the rate card currency into the target currency using the latest active exchange rate', async () => {
			currencyRepository.findByPk.mockResolvedValue(usd as never)
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([
				{ userId: 10, projectId: 1, totalHours: '10.00' },
			] as never)
			projectRepository.find.mockResolvedValue([project1] as never)
			projectResourceAssignmentRepository.findActiveByProjectIds.mockResolvedValue([
				{
					projectId: 1,
					userId: 10,
					user: { id: 10, countryId: 1 },
					resourceRoleType: { id: 5, name: 'Senior Developer' },
				},
			] as never)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue({
				costRate: '120.00',
				billingRate: '150.00',
				currencyId: 1, // SGD rate card, converting into USD (id 2)
			} as never)
			exchangeRateRepository.findLatestActiveRate.mockResolvedValue({
				rate: '0.740000',
			} as never)

			const result = await reportService.generateMonthlyCostRevenue({
				year: 2026,
				month: 6,
				currencyId: 2,
			})

			expect(exchangeRateRepository.findLatestActiveRate).toHaveBeenCalledWith(
				1,
				2,
				'2026-06-30'
			)
			expect(result.projects[0].breakdown[0]).toEqual({
				resourceRoleType: 'Senior Developer',
				hours: 10,
				costRate: 88.8,
				billingRate: 111,
				cost: 888,
				revenue: 1110,
			})
		})

		it('throws 400 when no active exchange rate exists to convert into the target currency', async () => {
			currencyRepository.findByPk.mockResolvedValue(usd as never)
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([
				{ userId: 10, projectId: 1, totalHours: '10.00' },
			] as never)
			projectRepository.find.mockResolvedValue([project1] as never)
			projectResourceAssignmentRepository.findActiveByProjectIds.mockResolvedValue([
				{
					projectId: 1,
					userId: 10,
					user: { id: 10, countryId: 1 },
					resourceRoleType: { id: 5, name: 'Senior Developer' },
				},
			] as never)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue({
				costRate: '120.00',
				billingRate: '150.00',
				currencyId: 1,
			} as never)
			exchangeRateRepository.findLatestActiveRate.mockResolvedValue(null)

			await expect(
				reportService.generateMonthlyCostRevenue({
					year: 2026,
					month: 6,
					currencyId: 2,
				})
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('falls back to a null cost/revenue bucket when no effective rate card is found', async () => {
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([
				{ userId: 10, projectId: 2, totalHours: '8.00' },
			] as never)
			projectRepository.find.mockResolvedValue([project2] as never)
			projectResourceAssignmentRepository.findActiveByProjectIds.mockResolvedValue([
				{
					projectId: 2,
					userId: 10,
					user: { id: 10, countryId: 1 },
					resourceRoleType: { id: 5, name: 'Senior Developer' },
				},
			] as never)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue(null)

			const result = await reportService.generateMonthlyCostRevenue({
				year: 2026,
				month: 6,
			})

			expect(result.projects[0].breakdown[0]).toEqual({
				resourceRoleType: 'Senior Developer',
				hours: 8,
				costRate: null,
				billingRate: null,
				cost: 0,
				revenue: 0,
			})
			expect(result.projects[0].totalCost).toBe(0)
		})
	})

	describe('exportUserRolesSummary / exportMonthlyCostRevenue', () => {
		it('builds a csv export for the user roles summary', async () => {
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([
				{ userId: 10, projectId: 1, totalHours: '20.00' },
			] as never)
			projectResourceAssignmentRepository.findActiveByProjectIds.mockResolvedValue([
				{
					projectId: 1,
					userId: 10,
					user: { id: 10, countryId: 1 },
					resourceRoleType: { id: 5, name: 'Senior Developer' },
				},
			] as never)

			const file = await reportService.exportUserRolesSummary(
				{ startDate: '2026-06-01', endDate: '2026-06-30' },
				'csv'
			)

			expect(file.fileName).toBe('user-roles-summary-2026-06.csv')
			expect(file.buffer.toString('utf-8')).toContain('Senior Developer')
		})

		it('builds an xlsx export for the monthly cost/revenue report', async () => {
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(sgd as never)
			reportRepository.sumHoursGroupedByUserAndProject.mockResolvedValue([])

			const file = await reportService.exportMonthlyCostRevenue(
				{ year: 2026, month: 6 },
				'xlsx'
			)

			expect(file.fileName).toBe('monthly-cost-revenue-2026-06.xlsx')
			expect(file.contentType).toBe(
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
		})
	})
})
