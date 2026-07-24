import express, { Application } from 'express'
import request from 'supertest'
import { ReportController } from '../ReportController'
import { IReportService } from '../../interfaces/service/IReportService'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way reportRoutes.ts wires the real routes
// (controller -> asyncHandler -> globalErrorHandler), but with a mocked
// IReportService so no DI container / real DB is involved (same convention
// as ExchangeRateController.test.ts / RateCardController.test.ts). Query-
// param validation for these GET-only endpoints lives in the controller
// itself (no zodSchemaValidator, which only runs for
// POST/PUT/PATCH/DELETE) — same convention as TimesheetEntryController.
describe('ReportController', () => {
	let reportServiceMock: jest.Mocked<IReportService>
	let app: Application

	beforeEach(() => {
		reportServiceMock = {
			generateTimesheetReport: jest.fn(),
			exportTimesheetReport: jest.fn(),
			generateUserRolesSummary: jest.fn(),
			exportUserRolesSummary: jest.fn(),
			generateMonthlyCostRevenue: jest.fn(),
			exportMonthlyCostRevenue: jest.fn(),
		} as unknown as jest.Mocked<IReportService>

		const reportController = new ReportController(reportServiceMock)

		app = express()
		app.use(express.json())
		app.route('/reports/timesheet').get(reportController.generateTimesheetReport)
		app
			.route('/reports/timesheet/export')
			.get(reportController.exportTimesheetReport)
		app
			.route('/reports/user-roles-summary')
			.get(reportController.generateUserRolesSummary)
		app
			.route('/reports/user-roles-summary/export')
			.get(reportController.exportUserRolesSummary)
		app
			.route('/reports/monthly-cost-revenue')
			.get(reportController.generateMonthlyCostRevenue)
		app
			.route('/reports/monthly-cost-revenue/export')
			.get(reportController.exportMonthlyCostRevenue)
		app.use(globalErrorHandler)
	})

	describe('GET /reports/timesheet', () => {
		it('parses filter query params through to the service', async () => {
			reportServiceMock.generateTimesheetReport.mockResolvedValue({
				reportGeneratedAt: new Date('2026-06-15T10:00:00Z'),
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				totalHours: 0,
				items: [],
				totalCount: 0,
			})

			await request(app).get(
				'/reports/timesheet?startDate=2026-06-01&endDate=2026-06-30&projectId=1&userId=10&isApproved=true&page=2&pageSize=25'
			)

			expect(reportServiceMock.generateTimesheetReport).toHaveBeenCalledWith({
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				projectId: 1,
				userId: 10,
				isApproved: true,
				page: 2,
				perPage: 25,
			})
		})

		it('defaults page to 1 and pageSize to the spec-mandated 100 when omitted', async () => {
			reportServiceMock.generateTimesheetReport.mockResolvedValue({
				reportGeneratedAt: new Date(),
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				totalHours: 0,
				items: [],
				totalCount: 0,
			})

			await request(app).get(
				'/reports/timesheet?startDate=2026-06-01&endDate=2026-06-30'
			)

			expect(reportServiceMock.generateTimesheetReport).toHaveBeenCalledWith(
				expect.objectContaining({ page: 1, perPage: 100 })
			)
		})

		it('returns 200 with the generated report envelope on success', async () => {
			reportServiceMock.generateTimesheetReport.mockResolvedValue({
				reportGeneratedAt: new Date('2026-06-15T10:00:00Z'),
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				totalHours: 320.5,
				items: [],
				totalCount: 200,
			})

			const res = await request(app).get(
				'/reports/timesheet?startDate=2026-06-01&endDate=2026-06-30'
			)

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data.totalHours).toBe(320.5)
			expect(res.body.data.totalCount).toBe(200)
		})

		it('propagates a domain AppException (e.g. project not found) through the central error handler', async () => {
			reportServiceMock.generateTimesheetReport.mockRejectedValue(
				new AppException('Project not found', 404)
			)

			const res = await request(app).get(
				'/reports/timesheet?startDate=2026-06-01&endDate=2026-06-30&projectId=999'
			)

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /reports/timesheet/export', () => {
		it('streams the exported file with the service-provided content type and filename', async () => {
			reportServiceMock.exportTimesheetReport.mockResolvedValue({
				fileName: 'timesheet-report-2026-06.xlsx',
				contentType:
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				buffer: Buffer.from('fake-xlsx-content'),
			})

			const res = await request(app).get(
				'/reports/timesheet/export?startDate=2026-06-01&endDate=2026-06-30'
			)

			expect(reportServiceMock.exportTimesheetReport).toHaveBeenCalledWith(
				expect.objectContaining({
					startDate: '2026-06-01',
					endDate: '2026-06-30',
				}),
				'xlsx'
			)
			expect(res.status).toBe(200)
			expect(res.headers['content-type']).toContain('spreadsheetml.sheet')
			expect(res.headers['content-disposition']).toBe(
				'attachment; filename="timesheet-report-2026-06.xlsx"'
			)
			expect(Buffer.isBuffer(res.body) ? res.body.toString('utf-8') : res.text).toBe(
				'fake-xlsx-content'
			)
		})

		it('passes csv through explicitly when requested', async () => {
			reportServiceMock.exportTimesheetReport.mockResolvedValue({
				fileName: 'timesheet-report-2026-06.csv',
				contentType: 'text/csv',
				buffer: Buffer.from('a,b\n1,2'),
			})

			await request(app).get(
				'/reports/timesheet/export?startDate=2026-06-01&endDate=2026-06-30&format=csv'
			)

			expect(reportServiceMock.exportTimesheetReport).toHaveBeenCalledWith(
				expect.anything(),
				'csv'
			)
		})

		it('returns 400 for an unsupported export format without calling the service', async () => {
			const res = await request(app).get(
				'/reports/timesheet/export?startDate=2026-06-01&endDate=2026-06-30&format=pdf'
			)

			expect(res.body.statusCode).toBe(400)
			expect(reportServiceMock.exportTimesheetReport).not.toHaveBeenCalled()
		})
	})

	describe('GET /reports/user-roles-summary', () => {
		it('returns 200 with the summarised report on success', async () => {
			reportServiceMock.generateUserRolesSummary.mockResolvedValue({
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				summary: [
					{
						resourceRoleType: { id: 5, name: 'Senior Developer' },
						totalHours: 120,
						userCount: 3,
					},
				],
				grandTotalHours: 120,
			})

			const res = await request(app).get(
				'/reports/user-roles-summary?startDate=2026-06-01&endDate=2026-06-30&projectId=1'
			)

			expect(reportServiceMock.generateUserRolesSummary).toHaveBeenCalledWith({
				startDate: '2026-06-01',
				endDate: '2026-06-30',
				projectId: 1,
			})
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data.grandTotalHours).toBe(120)
		})
	})

	describe('GET /reports/user-roles-summary/export', () => {
		it('streams the exported file', async () => {
			reportServiceMock.exportUserRolesSummary.mockResolvedValue({
				fileName: 'user-roles-summary-2026-06.csv',
				contentType: 'text/csv',
				buffer: Buffer.from('role,hours\nSenior Developer,120'),
			})

			const res = await request(app).get(
				'/reports/user-roles-summary/export?startDate=2026-06-01&endDate=2026-06-30&format=csv'
			)

			expect(res.status).toBe(200)
			expect(res.headers['content-disposition']).toBe(
				'attachment; filename="user-roles-summary-2026-06.csv"'
			)
		})
	})

	describe('GET /reports/monthly-cost-revenue', () => {
		it('parses year/month/projectId/currencyId query params through to the service', async () => {
			reportServiceMock.generateMonthlyCostRevenue.mockResolvedValue({
				year: 2026,
				month: 6,
				currency: { id: 1, code: 'SGD', symbol: 'S$' },
				projects: [],
			})

			await request(app).get(
				'/reports/monthly-cost-revenue?year=2026&month=6&projectId=1&currencyId=2'
			)

			expect(reportServiceMock.generateMonthlyCostRevenue).toHaveBeenCalledWith({
				year: 2026,
				month: 6,
				projectId: 1,
				currencyId: 2,
			})
		})

		it('propagates a domain AppException (e.g. invalid month) through the central error handler', async () => {
			reportServiceMock.generateMonthlyCostRevenue.mockRejectedValue(
				new AppException('month must be between 1 and 12', 400)
			)

			const res = await request(app).get(
				'/reports/monthly-cost-revenue?year=2026&month=13'
			)

			expect(res.body.statusCode).toBe(400)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /reports/monthly-cost-revenue/export', () => {
		it('streams the exported file', async () => {
			reportServiceMock.exportMonthlyCostRevenue.mockResolvedValue({
				fileName: 'monthly-cost-revenue-2026-06.xlsx',
				contentType:
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				buffer: Buffer.from('fake-xlsx-content'),
			})

			const res = await request(app).get(
				'/reports/monthly-cost-revenue/export?year=2026&month=6'
			)

			expect(reportServiceMock.exportMonthlyCostRevenue).toHaveBeenCalledWith(
				expect.objectContaining({ year: 2026, month: 6 }),
				'xlsx'
			)
			expect(res.status).toBe(200)
			expect(res.headers['content-disposition']).toBe(
				'attachment; filename="monthly-cost-revenue-2026-06.xlsx"'
			)
		})
	})
})
