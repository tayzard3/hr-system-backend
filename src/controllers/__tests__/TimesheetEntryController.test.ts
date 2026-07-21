import express, { Application, NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { TimesheetEntryController } from '../TimesheetEntryController'
import { ITimesheetEntryService } from '../../interfaces/service/ITimesheetEntryService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	bulkApproveTimesheetEntriesSchema,
	createTimesheetEntrySchema,
	updateTimesheetEntrySchema,
} from '../../validation/timesheetEntrySchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way timesheetEntryRoutes.ts wires the real
// routes (auth -> validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked ITimesheetEntryService and a stub
// auth middleware standing in for `protect` (same pattern as
// TimesheetPeriodController.test.ts).
describe('TimesheetEntryController', () => {
	let timesheetEntryServiceMock: jest.Mocked<ITimesheetEntryService>
	let app: Application
	let canManageAll: boolean

	const authenticatedUserId = 7

	const entry = {
		id: 1,
		user: { id: 7, fullName: 'John Doe' },
		project: { id: 2, code: 'PRJ-1', name: 'Project One' },
		timesheetPeriod: { id: 3, startDate: '2026-07-01', endDate: '2026-07-31' },
		entryDate: '2026-07-15',
		hours: 7.5,
		taskDescription: 'Implemented login flow',
		isApproved: false,
		approvedBy: null,
		approvedAt: null,
		createdAt: new Date('2026-07-15T09:00:00.000Z'),
		updatedAt: new Date('2026-07-15T09:00:00.000Z'),
	}

	beforeEach(() => {
		canManageAll = false

		timesheetEntryServiceMock = {
			getAllTimesheetEntries: jest.fn(),
			getTimesheetEntryById: jest.fn(),
			createTimesheetEntry: jest.fn(),
			updateTimesheetEntry: jest.fn(),
			deleteTimesheetEntry: jest.fn(),
			approveTimesheetEntry: jest.fn(),
			unapproveTimesheetEntry: jest.fn(),
			bulkApproveTimesheetEntries: jest.fn(),
		} as unknown as jest.Mocked<ITimesheetEntryService>

		const timesheetEntryController = new TimesheetEntryController(
			timesheetEntryServiceMock
		)

		app = express()
		app.use(express.json())
		app.use((req: Request, _res: Response, next: NextFunction) => {
			req.user = {
				id: authenticatedUserId,
				email: 'user@example.com',
				name: 'Authenticated User',
				roles: [],
				permissions: [],
			}
			// Minimal ability stub — `canManageAll` toggles whether
			// `TimesheetEntry_ManageAll` would be granted, mirroring how
			// `defineAbilitiesFor` would build it from real permissions.
			req.ability = {
				can: (action: string) =>
					action === 'ManageAll' ? canManageAll : true,
			} as never
			next()
		})
		app
			.route('/timesheet-entries')
			.get(timesheetEntryController.getAllTimesheetEntries)
			.post(
				zodSchemaValidator(createTimesheetEntrySchema),
				timesheetEntryController.createTimesheetEntry
			)
		app
			.route('/timesheet-entries/bulk-approve')
			.post(
				zodSchemaValidator(bulkApproveTimesheetEntriesSchema),
				timesheetEntryController.bulkApproveTimesheetEntries
			)
		app
			.route('/timesheet-entries/:id')
			.get(timesheetEntryController.getTimesheetEntryById)
			.put(
				zodSchemaValidator(updateTimesheetEntrySchema),
				timesheetEntryController.updateTimesheetEntry
			)
			.delete(timesheetEntryController.deleteTimesheetEntry)
		app
			.route('/timesheet-entries/:id/approve')
			.put(timesheetEntryController.approveTimesheetEntry)
		app
			.route('/timesheet-entries/:id/unapprove')
			.put(timesheetEntryController.unapproveTimesheetEntry)
		app.use(globalErrorHandler)
	})

	describe('GET /timesheet-entries', () => {
		it('returns the paginated list with summaries', async () => {
			const listResult = {
				items: [entry],
				totalCount: 1,
				dailySummaries: [],
				weeklySummaries: [],
				page: 1,
				pageSize: 50,
			}
			timesheetEntryServiceMock.getAllTimesheetEntries.mockResolvedValue(
				listResult as never
			)

			const res = await request(app).get('/timesheet-entries')

			expect(timesheetEntryServiceMock.getAllTimesheetEntries).toHaveBeenCalledWith(
				expect.objectContaining({ page: 1, perPage: 50 }),
				authenticatedUserId,
				false
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(JSON.parse(JSON.stringify(listResult)))
		})

		it('passes canManageAll through to the service', async () => {
			canManageAll = true
			timesheetEntryServiceMock.getAllTimesheetEntries.mockResolvedValue({
				items: [],
				totalCount: 0,
				dailySummaries: [],
				weeklySummaries: [],
				page: 1,
				pageSize: 50,
			} as never)

			await request(app).get('/timesheet-entries?userId=42')

			expect(timesheetEntryServiceMock.getAllTimesheetEntries).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 42 }),
				authenticatedUserId,
				true
			)
		})
	})

	describe('POST /timesheet-entries', () => {
		it('returns 422 when the body fails validation', async () => {
			const res = await request(app)
				.post('/timesheet-entries')
				.send({ projectId: 1 })

			expect(res.body.statusCode).toBe(422)
			expect(
				timesheetEntryServiceMock.createTimesheetEntry
			).not.toHaveBeenCalled()
		})

		it('creates the entry and returns 201', async () => {
			timesheetEntryServiceMock.createTimesheetEntry.mockResolvedValue({
				...entry,
				projectId: 2,
				projectName: 'Project One',
			} as never)

			const res = await request(app).post('/timesheet-entries').send({
				projectId: 2,
				entryDate: '2026-07-15',
				hours: 7.5,
				taskDescription: 'Implemented login flow',
			})

			expect(timesheetEntryServiceMock.createTimesheetEntry).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 2, hours: 7.5 }),
				authenticatedUserId
			)
			expect(res.body.statusCode).toBe(201)
		})

		it('propagates a domain AppException through the central error handler', async () => {
			timesheetEntryServiceMock.createTimesheetEntry.mockRejectedValue(
				new AppException('You are not assigned to this project', 403)
			)

			const res = await request(app).post('/timesheet-entries').send({
				projectId: 2,
				entryDate: '2026-07-15',
				hours: 7.5,
				taskDescription: 'Implemented login flow',
			})

			expect(res.body.statusCode).toBe(403)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /timesheet-entries/:id', () => {
		it('returns the entry when found', async () => {
			timesheetEntryServiceMock.getTimesheetEntryById.mockResolvedValue(
				entry as never
			)

			const res = await request(app).get('/timesheet-entries/1')

			expect(timesheetEntryServiceMock.getTimesheetEntryById).toHaveBeenCalledWith(
				1,
				authenticatedUserId,
				false
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(JSON.parse(JSON.stringify(entry)))
		})

		it('maps a 403 domain error through the central error handler', async () => {
			timesheetEntryServiceMock.getTimesheetEntryById.mockRejectedValue(
				new AppException(
					"Forbidden: cannot access another user's timesheet entry",
					403
				)
			)

			const res = await request(app).get('/timesheet-entries/1')

			expect(res.body.statusCode).toBe(403)
		})
	})

	describe('PUT /timesheet-entries/:id', () => {
		it('returns 422 when neither hours nor taskDescription is provided', async () => {
			const res = await request(app).put('/timesheet-entries/1').send({})

			expect(res.body.statusCode).toBe(422)
			expect(
				timesheetEntryServiceMock.updateTimesheetEntry
			).not.toHaveBeenCalled()
		})

		it('updates the entry and returns 200', async () => {
			timesheetEntryServiceMock.updateTimesheetEntry.mockResolvedValue({
				...entry,
				hours: 8,
			} as never)

			const res = await request(app)
				.put('/timesheet-entries/1')
				.send({ hours: 8 })

			expect(timesheetEntryServiceMock.updateTimesheetEntry).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ hours: 8 }),
				authenticatedUserId
			)
			expect(res.body.statusCode).toBe(200)
		})
	})

	describe('DELETE /timesheet-entries/:id', () => {
		it('returns 404 when the entry does not exist', async () => {
			timesheetEntryServiceMock.deleteTimesheetEntry.mockResolvedValue(false)

			const res = await request(app).delete('/timesheet-entries/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the entry and returns 200', async () => {
			timesheetEntryServiceMock.deleteTimesheetEntry.mockResolvedValue(true)

			const res = await request(app).delete('/timesheet-entries/1')

			expect(timesheetEntryServiceMock.deleteTimesheetEntry).toHaveBeenCalledWith(
				1,
				authenticatedUserId,
				false
			)
			expect(res.body.statusCode).toBe(200)
		})
	})

	describe('PUT /timesheet-entries/:id/approve', () => {
		it('approves the entry', async () => {
			timesheetEntryServiceMock.approveTimesheetEntry.mockResolvedValue({
				id: 1,
				isApproved: true,
				approvedAt: new Date('2026-07-16T10:00:00.000Z'),
				approvedBy: authenticatedUserId,
			})

			const res = await request(app).put('/timesheet-entries/1/approve')

			expect(timesheetEntryServiceMock.approveTimesheetEntry).toHaveBeenCalledWith(
				1,
				authenticatedUserId
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data.isApproved).toBe(true)
		})

		it('propagates a 409 when already approved', async () => {
			timesheetEntryServiceMock.approveTimesheetEntry.mockRejectedValue(
				new AppException('Timesheet entry is already approved', 409)
			)

			const res = await request(app).put('/timesheet-entries/1/approve')

			expect(res.body.statusCode).toBe(409)
		})
	})

	describe('PUT /timesheet-entries/:id/unapprove', () => {
		it('reverses approval', async () => {
			timesheetEntryServiceMock.unapproveTimesheetEntry.mockResolvedValue(
				undefined
			)

			const res = await request(app).put('/timesheet-entries/1/unapprove')

			expect(
				timesheetEntryServiceMock.unapproveTimesheetEntry
			).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.message).toBe('Approval reversed.')
		})
	})

	describe('POST /timesheet-entries/bulk-approve', () => {
		it('returns 422 when entryIds is empty', async () => {
			const res = await request(app)
				.post('/timesheet-entries/bulk-approve')
				.send({ entryIds: [] })

			expect(res.body.statusCode).toBe(422)
			expect(
				timesheetEntryServiceMock.bulkApproveTimesheetEntries
			).not.toHaveBeenCalled()
		})

		it('approves the given entries and reports counts', async () => {
			timesheetEntryServiceMock.bulkApproveTimesheetEntries.mockResolvedValue({
				approvedCount: 2,
				skippedCount: 1,
			})

			const res = await request(app)
				.post('/timesheet-entries/bulk-approve')
				.send({ entryIds: [1, 2, 3] })

			expect(
				timesheetEntryServiceMock.bulkApproveTimesheetEntries
			).toHaveBeenCalledWith([1, 2, 3], authenticatedUserId)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual({ approvedCount: 2, skippedCount: 1 })
		})
	})
})
