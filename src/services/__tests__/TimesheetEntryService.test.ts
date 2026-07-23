import { Transaction } from 'sequelize'
import { ITimesheetEntryRepository } from '../../interfaces/repository/ITimesheetEntryRepository'
import { IProjectRepository } from '../../interfaces/repository/IProjectRepository'
import { IProjectResourceAssignmentRepository } from '../../interfaces/repository/IProjectResourceAssignmentRepository'
import { ITimesheetPeriodRepository } from '../../interfaces/repository/ITimesheetPeriodRepository'

// TimesheetEntryService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)`. Mock the whole models module so unit tests never touch
// a real DB connection (same pattern as TimesheetPeriodService.test.ts).
const transactionMock = jest.fn(
	async (cb: (t: Transaction) => Promise<unknown>) =>
		cb({} as unknown as Transaction)
)

jest.mock('../../models', () => ({
	sequelize: {
		transaction: (cb: (t: Transaction) => Promise<unknown>) =>
			transactionMock(cb),
	},
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { TimesheetEntryService } from '../TimesheetEntryService'

describe('TimesheetEntryService', () => {
	let timesheetEntryRepository: jest.Mocked<ITimesheetEntryRepository>
	let projectRepository: jest.Mocked<IProjectRepository>
	let projectResourceAssignmentRepository: jest.Mocked<IProjectResourceAssignmentRepository>
	let timesheetPeriodRepository: jest.Mocked<ITimesheetPeriodRepository>
	let timesheetEntryService: TimesheetEntryService

	const currentUserId = 7
	const otherUserId = 99

	const project = {
		id: 1,
		code: 'PRJ-1',
		name: 'Project One',
		isActive: true,
		maxDailyHours: '8.00',
	}

	const period = {
		id: 5,
		startDate: '2026-07-01',
		endDate: '2026-07-31',
		isLocked: false,
	}

	const baseEntry = {
		id: 10,
		userId: currentUserId,
		projectId: project.id,
		timesheetPeriodId: period.id,
		entryDate: '2026-07-15',
		hours: '7.50',
		description: 'Did some work',
		isApproved: false,
		approvedBy: null,
		approvedAt: null,
		createdAt: new Date('2026-07-15T09:00:00.000Z'),
		updatedAt: new Date('2026-07-15T09:00:00.000Z'),
		user: { id: currentUserId, name: 'John Doe' },
		project,
		timesheetPeriod: period,
	}

	beforeEach(() => {
		jest.clearAllMocks()

		timesheetEntryRepository = {
			findByUserProjectAndDate: jest.fn(),
			sumHoursGroupedByDate: jest.fn(),
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
		} as unknown as jest.Mocked<ITimesheetEntryRepository>

		projectRepository = {
			findByCode: jest.fn(),
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
		} as unknown as jest.Mocked<IProjectRepository>

		projectResourceAssignmentRepository = {
			findActiveByProjectAndUser: jest.fn(),
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
		} as unknown as jest.Mocked<IProjectResourceAssignmentRepository>

		timesheetPeriodRepository = {
			findOverlapping: jest.fn(),
			findByDate: jest.fn(),
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
		} as unknown as jest.Mocked<ITimesheetPeriodRepository>

		timesheetEntryService = new TimesheetEntryService(
			timesheetEntryRepository,
			projectRepository,
			projectResourceAssignmentRepository,
			timesheetPeriodRepository
		)
	})

	describe('createTimesheetEntry', () => {
		const dto = {
			projectId: project.id,
			entryDate: '2026-07-15',
			hours: 7.5,
			taskDescription: 'Implemented login flow',
		}

		it('throws 404 when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetEntryService.createTimesheetEntry(dto, currentUserId)
			).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 })
		})

		it('throws 400 when the project is inactive', async () => {
			projectRepository.findByPk.mockResolvedValue({
				...project,
				isActive: false,
			} as never)

			await expect(
				timesheetEntryService.createTimesheetEntry(dto, currentUserId)
			).rejects.toMatchObject({
				message: 'Project is not active',
				statusCode: 400,
			})
		})

		it('throws 403 when the user is not assigned to the project', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				null
			)

			await expect(
				timesheetEntryService.createTimesheetEntry(dto, currentUserId)
			).rejects.toMatchObject({
				message: 'You are not assigned to this project',
				statusCode: 403,
			})
		})

		it('throws 400 when entryDate falls outside any timesheet period', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				{} as never
			)
			timesheetPeriodRepository.findByDate.mockResolvedValue(null)

			await expect(
				timesheetEntryService.createTimesheetEntry(dto, currentUserId)
			).rejects.toMatchObject({
				message: 'No timesheet period is defined for this date',
				statusCode: 400,
			})
		})

		it('throws 400 when the resolved period is locked', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				{} as never
			)
			timesheetPeriodRepository.findByDate.mockResolvedValue({
				...period,
				isLocked: true,
			} as never)

			await expect(
				timesheetEntryService.createTimesheetEntry(dto, currentUserId)
			).rejects.toMatchObject({
				message: 'Cannot log time against a locked timesheet period',
				statusCode: 400,
			})
		})

		it("throws 400 when hours exceed the project's maxDailyHours", async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				{} as never
			)
			timesheetPeriodRepository.findByDate.mockResolvedValue(period as never)

			await expect(
				timesheetEntryService.createTimesheetEntry(
					{ ...dto, hours: 9 },
					currentUserId
				)
			).rejects.toMatchObject({
				message:
					"hours cannot exceed the project's max daily hours (8)",
				statusCode: 400,
			})
			expect(
				timesheetEntryRepository.findByUserProjectAndDate
			).not.toHaveBeenCalled()
		})

		it('throws 409 when a duplicate entry already exists', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				{} as never
			)
			timesheetPeriodRepository.findByDate.mockResolvedValue(period as never)
			timesheetEntryRepository.findByUserProjectAndDate.mockResolvedValue(
				baseEntry as never
			)

			await expect(
				timesheetEntryService.createTimesheetEntry(dto, currentUserId)
			).rejects.toMatchObject({
				message: 'A timesheet entry already exists for this project and date',
				statusCode: 409,
			})
			expect(timesheetEntryRepository.create).not.toHaveBeenCalled()
		})

		it('creates the entry inside a transaction and returns the mapped response', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				{} as never
			)
			timesheetPeriodRepository.findByDate.mockResolvedValue(period as never)
			timesheetEntryRepository.findByUserProjectAndDate.mockResolvedValue(null)
			timesheetEntryRepository.create.mockResolvedValue(baseEntry as never)

			const result = await timesheetEntryService.createTimesheetEntry(
				dto,
				currentUserId
			)

			expect(transactionMock).toHaveBeenCalledTimes(1)
			expect(timesheetEntryRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: currentUserId,
					projectId: project.id,
					timesheetPeriodId: period.id,
					entryDate: dto.entryDate,
					hours: '7.50',
					description: dto.taskDescription,
				}),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual({
				id: baseEntry.id,
				projectId: project.id,
				projectName: project.name,
				entryDate: baseEntry.entryDate,
				hours: 7.5,
				taskDescription: baseEntry.description,
				isApproved: false,
				timesheetPeriod: {
					id: period.id,
					startDate: period.startDate,
					endDate: period.endDate,
				},
			})
		})
	})

	describe('getTimesheetEntryById', () => {
		it('throws 404 when the entry does not exist', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetEntryService.getTimesheetEntryById(999, currentUserId, false)
			).rejects.toMatchObject({
				message: 'Timesheet entry not found',
				statusCode: 404,
			})
		})

		it("throws 403 when accessing another user's entry without ManageAll", async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				userId: otherUserId,
			} as never)

			await expect(
				timesheetEntryService.getTimesheetEntryById(10, currentUserId, false)
			).rejects.toMatchObject({ statusCode: 403 })
		})

		it("allows a ManageAll caller to view another user's entry", async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				userId: otherUserId,
			} as never)

			const result = await timesheetEntryService.getTimesheetEntryById(
				10,
				currentUserId,
				true
			)
			expect(result.id).toBe(baseEntry.id)
		})

		it('returns the mapped detail DTO for the owner', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(baseEntry as never)

			const result = await timesheetEntryService.getTimesheetEntryById(
				10,
				currentUserId,
				false
			)

			expect(result).toMatchObject({
				id: baseEntry.id,
				hours: 7.5,
				taskDescription: baseEntry.description,
				user: { id: currentUserId, fullName: 'John Doe' },
				project: { id: project.id, code: project.code, name: project.name },
			})
		})
	})

	describe('updateTimesheetEntry', () => {
		it('throws 404 when the entry does not exist', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetEntryService.updateTimesheetEntry(
					999,
					{ hours: 5 },
					currentUserId
				)
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('throws 403 when the caller does not own the entry', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				userId: otherUserId,
				update: jest.fn(),
			} as never)

			await expect(
				timesheetEntryService.updateTimesheetEntry(
					10,
					{ hours: 5 },
					currentUserId
				)
			).rejects.toMatchObject({ statusCode: 403 })
		})

		it('throws 400 when the timesheet period is locked', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				timesheetPeriod: { ...period, isLocked: true },
				update: jest.fn(),
			} as never)

			await expect(
				timesheetEntryService.updateTimesheetEntry(
					10,
					{ hours: 5 },
					currentUserId
				)
			).rejects.toMatchObject({
				message: 'Cannot update an entry in a locked timesheet period',
				statusCode: 400,
			})
		})

		it('throws 400 when the entry is already approved', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				isApproved: true,
				update: jest.fn(),
			} as never)

			await expect(
				timesheetEntryService.updateTimesheetEntry(
					10,
					{ hours: 5 },
					currentUserId
				)
			).rejects.toMatchObject({
				message: 'Cannot update an already-approved timesheet entry',
				statusCode: 400,
			})
		})

		it("throws 400 when hours exceed the project's maxDailyHours", async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				update: jest.fn(),
			} as never)

			await expect(
				timesheetEntryService.updateTimesheetEntry(
					10,
					{ hours: 9 },
					currentUserId
				)
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('updates hours/taskDescription inside a transaction', async () => {
			const updatedEntry = {
				...baseEntry,
				hours: '5.00',
				description: 'Updated description',
			}
			const instance = {
				...baseEntry,
				update: jest.fn().mockResolvedValue(updatedEntry),
			}
			timesheetEntryRepository.findByPk.mockResolvedValue(instance as never)

			const result = await timesheetEntryService.updateTimesheetEntry(
				10,
				{ hours: 5, taskDescription: 'Updated description' },
				currentUserId
			)

			expect(instance.update).toHaveBeenCalledWith(
				{ hours: '5.00', description: 'Updated description' },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result.hours).toBe(5)
			expect(result.taskDescription).toBe('Updated description')
		})
	})

	describe('deleteTimesheetEntry', () => {
		it('returns false when the entry does not exist', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetEntryService.deleteTimesheetEntry(999, currentUserId, false)
			).resolves.toBe(false)
			expect(timesheetEntryRepository.delete).not.toHaveBeenCalled()
		})

		it('throws 403 when a non-owner without ManageAll attempts to delete', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				userId: otherUserId,
			} as never)

			await expect(
				timesheetEntryService.deleteTimesheetEntry(10, currentUserId, false)
			).rejects.toMatchObject({ statusCode: 403 })
		})

		it('allows a ManageAll caller to delete any entry', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				userId: otherUserId,
			} as never)
			timesheetEntryRepository.delete.mockResolvedValue(1)

			await expect(
				timesheetEntryService.deleteTimesheetEntry(10, currentUserId, true)
			).resolves.toBe(true)
		})

		it('throws 400 when the period is locked', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				timesheetPeriod: { isLocked: true },
			} as never)

			await expect(
				timesheetEntryService.deleteTimesheetEntry(10, currentUserId, false)
			).rejects.toMatchObject({
				message: 'Cannot delete an entry in a locked timesheet period',
				statusCode: 400,
			})
		})

		it('throws 400 when the entry is already approved', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				isApproved: true,
			} as never)

			await expect(
				timesheetEntryService.deleteTimesheetEntry(10, currentUserId, false)
			).rejects.toMatchObject({ statusCode: 400 })
		})

		it('soft-deletes the entry and returns true', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(baseEntry as never)
			timesheetEntryRepository.delete.mockResolvedValue(1)

			await expect(
				timesheetEntryService.deleteTimesheetEntry(10, currentUserId, false)
			).resolves.toBe(true)
			expect(timesheetEntryRepository.delete).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: 10 } })
			)
		})
	})

	describe('approveTimesheetEntry', () => {
		it('throws 404 when the entry does not exist', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetEntryService.approveTimesheetEntry(999, 1)
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('throws 409 when the entry is already approved', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue({
				...baseEntry,
				isApproved: true,
			} as never)

			await expect(
				timesheetEntryService.approveTimesheetEntry(10, 1)
			).rejects.toMatchObject({
				message: 'Timesheet entry is already approved',
				statusCode: 409,
			})
		})

		it('approves the entry, stamping approvedBy/approvedAt', async () => {
			const instance = {
				...baseEntry,
				update: jest.fn().mockResolvedValue({
					...baseEntry,
					isApproved: true,
					approvedBy: 1,
					approvedAt: new Date('2026-07-16T10:00:00.000Z'),
				}),
			}
			timesheetEntryRepository.findByPk.mockResolvedValue(instance as never)

			const result = await timesheetEntryService.approveTimesheetEntry(10, 1)

			expect(instance.update).toHaveBeenCalledWith(
				expect.objectContaining({ isApproved: true, approvedBy: 1 }),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result.isApproved).toBe(true)
			expect(result.approvedBy).toBe(1)
		})
	})

	describe('unapproveTimesheetEntry', () => {
		it('throws 404 when the entry does not exist', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetEntryService.unapproveTimesheetEntry(999)
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('throws 409 when the entry is not approved', async () => {
			timesheetEntryRepository.findByPk.mockResolvedValue(baseEntry as never)

			await expect(
				timesheetEntryService.unapproveTimesheetEntry(10)
			).rejects.toMatchObject({
				message: 'Timesheet entry is not approved',
				statusCode: 409,
			})
		})

		it('reverses approval', async () => {
			const instance = {
				...baseEntry,
				isApproved: true,
				update: jest.fn().mockResolvedValue(undefined),
			}
			timesheetEntryRepository.findByPk.mockResolvedValue(instance as never)

			await timesheetEntryService.unapproveTimesheetEntry(10)

			expect(instance.update).toHaveBeenCalledWith(
				{ isApproved: false, approvedBy: null, approvedAt: null },
				expect.objectContaining({ transaction: expect.anything() })
			)
		})

		// Regression check for the Invoice feature (see the
		// `add-invoiced-at-to-timesheet-entries` migration and
		// `TimesheetEntry.invoicedAt`'s doc-comment): the API spec documents
		// `UnapproveTimesheetEntry` as "(only if not yet invoiced)" with a
		// `409 entry already included in an invoice` error response. This
		// was originally missing (see the QA report for this feature) —
		// `unapproveTimesheetEntry` did not check `invoicedAt`, so an
		// already-invoiced entry could be unapproved, leaving an active
		// invoice line item pointing at an entry that is no longer approved.
		// The guard has since been added; this test now passes and guards
		// against regressing it.
		it('throws 409 when the entry has already been invoiced', async () => {
			const instance = {
				...baseEntry,
				isApproved: true,
				invoicedAt: new Date('2026-07-20T00:00:00.000Z'),
				update: jest.fn().mockResolvedValue(undefined),
			}
			timesheetEntryRepository.findByPk.mockResolvedValue(instance as never)

			await expect(
				timesheetEntryService.unapproveTimesheetEntry(10)
			).rejects.toMatchObject({ statusCode: 409 })

			expect(instance.update).not.toHaveBeenCalled()
		})
	})

	describe('bulkApproveTimesheetEntries', () => {
		it('returns zero counts for an empty id list without touching the repository', async () => {
			const result = await timesheetEntryService.bulkApproveTimesheetEntries(
				[],
				1
			)

			expect(result).toEqual({ approvedCount: 0, skippedCount: 0 })
			expect(timesheetEntryRepository.update).not.toHaveBeenCalled()
		})

		it('approves eligible entries and reports skipped ones', async () => {
			timesheetEntryRepository.update.mockResolvedValue([2, []] as never)

			const result = await timesheetEntryService.bulkApproveTimesheetEntries(
				[1, 2, 3],
				9
			)

			expect(timesheetEntryRepository.update).toHaveBeenCalledWith(
				expect.objectContaining({ isApproved: true, approvedBy: 9 }),
				expect.objectContaining({
					where: expect.objectContaining({ isApproved: false }),
					transaction: expect.anything(),
				})
			)
			expect(result).toEqual({ approvedCount: 2, skippedCount: 1 })
		})
	})

	describe('getAllTimesheetEntries', () => {
		it("forces the userId filter to the caller's own id when canManageAll is false", async () => {
			timesheetEntryRepository.findAndPaginate.mockResolvedValue({
				data: [baseEntry],
				total: 1,
				totalResults: 1,
				page: 1,
				perPage: 50,
			} as never)
			timesheetEntryRepository.sumHoursGroupedByDate.mockResolvedValue([
				{ entryDate: '2026-07-15', totalHours: '7.50' },
			])

			await timesheetEntryService.getAllTimesheetEntries(
				{ userId: otherUserId, page: 1, perPage: 50 },
				currentUserId,
				false
			)

			expect(timesheetEntryRepository.findAndPaginate).toHaveBeenCalledWith(
				1,
				50,
				expect.objectContaining({
					where: expect.objectContaining({ userId: currentUserId }),
				})
			)
		})

		it('honours an explicit userId filter when canManageAll is true', async () => {
			timesheetEntryRepository.findAndPaginate.mockResolvedValue({
				data: [],
				total: 0,
				totalResults: 0,
				page: 1,
				perPage: 50,
			} as never)
			timesheetEntryRepository.sumHoursGroupedByDate.mockResolvedValue([])

			await timesheetEntryService.getAllTimesheetEntries(
				{ userId: otherUserId, page: 1, perPage: 50 },
				currentUserId,
				true
			)

			expect(timesheetEntryRepository.findAndPaginate).toHaveBeenCalledWith(
				1,
				50,
				expect.objectContaining({
					where: expect.objectContaining({ userId: otherUserId }),
				})
			)
		})

		it('builds daily and weekly summaries from the aggregated totals', async () => {
			timesheetEntryRepository.findAndPaginate.mockResolvedValue({
				data: [baseEntry],
				total: 1,
				totalResults: 1,
				page: 1,
				perPage: 50,
			} as never)
			// 2026-07-13 is a Monday, 2026-07-15 a Wednesday of the same ISO week.
			timesheetEntryRepository.sumHoursGroupedByDate.mockResolvedValue([
				{ entryDate: '2026-07-13', totalHours: '8.00' },
				{ entryDate: '2026-07-15', totalHours: '7.50' },
			])

			const result = await timesheetEntryService.getAllTimesheetEntries(
				{ page: 1, perPage: 50 },
				currentUserId,
				false
			)

			expect(result.dailySummaries).toEqual([
				{ date: '2026-07-13', totalHours: 8 },
				{ date: '2026-07-15', totalHours: 7.5 },
			])
			expect(result.weeklySummaries).toEqual([
				{ weekStart: '2026-07-13', weekEnd: '2026-07-19', totalHours: 15.5 },
			])
			expect(result.totalCount).toBe(1)
			expect(result.items).toHaveLength(1)
		})
	})
})
