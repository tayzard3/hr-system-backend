import express, { Application, NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { TimesheetPeriodController } from '../TimesheetPeriodController'
import { ITimesheetPeriodService } from '../../interfaces/service/ITimesheetPeriodService'
import zodSchemaValidator from '../../validation/zodValidator'
import { createTimesheetPeriodSchema } from '../../validation/timesheetPeriodSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way timesheetPeriodRoutes.ts wires the real
// routes (auth -> validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked ITimesheetPeriodService and a stub
// auth middleware standing in for `protect` (same pattern as
// AuthController.changePassword.test.ts / CountryController.test.ts).
describe('TimesheetPeriodController', () => {
	let timesheetPeriodServiceMock: jest.Mocked<ITimesheetPeriodService>
	let app: Application

	const authenticatedUserId = 7

	const period = {
		id: 1,
		startDate: '2026-07-01',
		endDate: '2026-07-31',
		isLocked: false,
		lockedAt: null,
		lockedBy: null,
	}

	beforeEach(() => {
		timesheetPeriodServiceMock = {
			getAllTimesheetPeriods: jest.fn(),
			getTimesheetPeriodById: jest.fn(),
			createTimesheetPeriod: jest.fn(),
			lockTimesheetPeriod: jest.fn(),
			unlockTimesheetPeriod: jest.fn(),
			deleteTimesheetPeriod: jest.fn(),
		} as unknown as jest.Mocked<ITimesheetPeriodService>

		const timesheetPeriodController = new TimesheetPeriodController(
			timesheetPeriodServiceMock
		)

		app = express()
		app.use(express.json())
		app.use((req: Request, _res: Response, next: NextFunction) => {
			req.user = {
				id: authenticatedUserId,
				email: 'admin@example.com',
				name: 'Admin User',
				roles: ['SystemAdmin'],
				permissions: [],
			}
			next()
		})
		app
			.route('/timesheet-periods')
			.get(timesheetPeriodController.getAllTimesheetPeriods)
			.post(
				zodSchemaValidator(createTimesheetPeriodSchema),
				timesheetPeriodController.createTimesheetPeriod
			)
		app
			.route('/timesheet-periods/:id')
			.get(timesheetPeriodController.getTimesheetPeriodById)
			.delete(timesheetPeriodController.deleteTimesheetPeriod)
		app
			.route('/timesheet-periods/:id/lock')
			.put(timesheetPeriodController.lockTimesheetPeriod)
		app
			.route('/timesheet-periods/:id/unlock')
			.put(timesheetPeriodController.unlockTimesheetPeriod)
		app.use(globalErrorHandler)
	})

	describe('GET /timesheet-periods', () => {
		it('returns the list of timesheet periods', async () => {
			timesheetPeriodServiceMock.getAllTimesheetPeriods.mockResolvedValue([
				period,
			] as never)

			const res = await request(app).get('/timesheet-periods')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data).toEqual([period])
		})

		it('forwards isLocked/year/month query params to the service', async () => {
			timesheetPeriodServiceMock.getAllTimesheetPeriods.mockResolvedValue([])

			await request(app).get(
				'/timesheet-periods?isLocked=true&year=2026&month=7'
			)

			expect(
				timesheetPeriodServiceMock.getAllTimesheetPeriods
			).toHaveBeenCalledWith({ isLocked: true, year: 2026, month: 7 })
		})
	})

	describe('POST /timesheet-periods', () => {
		it('returns 422 when startDate is not YYYY-MM-DD', async () => {
			const res = await request(app)
				.post('/timesheet-periods')
				.send({ startDate: '07-01-2026', endDate: '2026-07-31' })

			expect(res.body.statusCode).toBe(422)
			expect(
				timesheetPeriodServiceMock.createTimesheetPeriod
			).not.toHaveBeenCalled()
		})

		it('creates the period and returns 201 on success', async () => {
			timesheetPeriodServiceMock.createTimesheetPeriod.mockResolvedValue(
				period as never
			)

			const res = await request(app)
				.post('/timesheet-periods')
				.send({ startDate: '2026-07-01', endDate: '2026-07-31' })

			expect(
				timesheetPeriodServiceMock.createTimesheetPeriod
			).toHaveBeenCalledWith(
				expect.objectContaining({
					startDate: '2026-07-01',
					endDate: '2026-07-31',
				})
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(period)
		})

		it('propagates a domain AppException (e.g. overlap) through the central error handler', async () => {
			timesheetPeriodServiceMock.createTimesheetPeriod.mockRejectedValue(
				new AppException(
					'A timesheet period overlapping this date range already exists',
					409
				)
			)

			const res = await request(app)
				.post('/timesheet-periods')
				.send({ startDate: '2026-07-01', endDate: '2026-07-31' })

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /timesheet-periods/:id', () => {
		it('returns the period when found', async () => {
			timesheetPeriodServiceMock.getTimesheetPeriodById.mockResolvedValue(
				period as never
			)

			const res = await request(app).get('/timesheet-periods/1')

			expect(
				timesheetPeriodServiceMock.getTimesheetPeriodById
			).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(period)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			timesheetPeriodServiceMock.getTimesheetPeriodById.mockRejectedValue(
				new AppException('Timesheet period not found', 404)
			)

			const res = await request(app).get('/timesheet-periods/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /timesheet-periods/:id/lock', () => {
		it('locks the period using the authenticated user as the locker', async () => {
			timesheetPeriodServiceMock.lockTimesheetPeriod.mockResolvedValue({
				...period,
				isLocked: true,
				lockedBy: authenticatedUserId,
			} as never)

			const res = await request(app).put('/timesheet-periods/1/lock')

			expect(
				timesheetPeriodServiceMock.lockTimesheetPeriod
			).toHaveBeenCalledWith(1, authenticatedUserId)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data.isLocked).toBe(true)
		})

		it('propagates a 409 when the period is already locked', async () => {
			timesheetPeriodServiceMock.lockTimesheetPeriod.mockRejectedValue(
				new AppException('Timesheet period is already locked', 409)
			)

			const res = await request(app).put('/timesheet-periods/1/lock')

			expect(res.body.statusCode).toBe(409)
		})
	})

	describe('PUT /timesheet-periods/:id/unlock', () => {
		it('unlocks the period', async () => {
			timesheetPeriodServiceMock.unlockTimesheetPeriod.mockResolvedValue({
				...period,
				isLocked: false,
			} as never)

			const res = await request(app).put('/timesheet-periods/1/unlock')

			expect(
				timesheetPeriodServiceMock.unlockTimesheetPeriod
			).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
		})
	})

	describe('DELETE /timesheet-periods/:id', () => {
		it('returns 404 when the period does not exist', async () => {
			timesheetPeriodServiceMock.deleteTimesheetPeriod.mockResolvedValue(
				false
			)

			const res = await request(app).delete('/timesheet-periods/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the period and returns 200 on success', async () => {
			timesheetPeriodServiceMock.deleteTimesheetPeriod.mockResolvedValue(true)

			const res = await request(app).delete('/timesheet-periods/1')

			expect(
				timesheetPeriodServiceMock.deleteTimesheetPeriod
			).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
		})
	})
})
