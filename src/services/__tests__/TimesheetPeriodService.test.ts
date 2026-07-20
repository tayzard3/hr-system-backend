import { Transaction } from 'sequelize'
import { ITimesheetPeriodRepository } from '../../interfaces/repository/ITimesheetPeriodRepository'

// TimesheetPeriodService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)`. Mock the whole models module so unit tests never touch
// a real DB connection (same pattern as CountryService.test.ts).
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
import { TimesheetPeriodService } from '../TimesheetPeriodService'

describe('TimesheetPeriodService', () => {
	let timesheetPeriodRepository: jest.Mocked<ITimesheetPeriodRepository>
	let timesheetPeriodService: TimesheetPeriodService

	const period: {
		id: number
		startDate: string
		endDate: string
		year: number
		month: number
		isLocked: boolean
		lockedAt: Date | null
		lockedBy: number | null
		get: jest.Mock
	} = {
		id: 1,
		startDate: '2026-07-01',
		endDate: '2026-07-31',
		year: 2026,
		month: 7,
		isLocked: false,
		lockedAt: null,
		lockedBy: null,
		get: jest.fn(),
	}

	const asResponseDTO = (p: typeof period) => ({
		id: p.id,
		startDate: p.startDate,
		endDate: p.endDate,
		isLocked: p.isLocked,
		lockedAt: p.lockedAt,
		lockedBy: p.lockedBy,
	})

	beforeEach(() => {
		period.get.mockReturnValue(period)

		timesheetPeriodRepository = {
			findOverlapping: jest.fn(),
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

		timesheetPeriodService = new TimesheetPeriodService(
			timesheetPeriodRepository
		)
	})

	describe('createTimesheetPeriod', () => {
		it('throws 400 when endDate is before startDate', async () => {
			await expect(
				timesheetPeriodService.createTimesheetPeriod({
					startDate: '2026-07-31',
					endDate: '2026-07-01',
				})
			).rejects.toMatchObject({
				message: 'endDate cannot be before startDate',
				statusCode: 400,
			})
			expect(timesheetPeriodRepository.findOverlapping).not.toHaveBeenCalled()
		})

		it('throws 409 when an overlapping period already exists', async () => {
			timesheetPeriodRepository.findOverlapping.mockResolvedValue(
				period as never
			)

			await expect(
				timesheetPeriodService.createTimesheetPeriod({
					startDate: '2026-07-01',
					endDate: '2026-07-31',
				})
			).rejects.toMatchObject({
				message:
					'A timesheet period overlapping this date range already exists',
				statusCode: 409,
			})
			expect(timesheetPeriodRepository.create).not.toHaveBeenCalled()
		})

		it('derives year/month from startDate and creates the period', async () => {
			timesheetPeriodRepository.findOverlapping.mockResolvedValue(null)
			timesheetPeriodRepository.create.mockResolvedValue(period as never)

			const result = await timesheetPeriodService.createTimesheetPeriod({
				startDate: '2026-07-01',
				endDate: '2026-07-31',
			})

			expect(timesheetPeriodRepository.create).toHaveBeenCalledWith(
				{
					startDate: '2026-07-01',
					endDate: '2026-07-31',
					year: 2026,
					month: 7,
				},
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual(asResponseDTO(period))
		})

		it('throws 500 when the repository fails to persist the period', async () => {
			timesheetPeriodRepository.findOverlapping.mockResolvedValue(null)
			timesheetPeriodRepository.create.mockResolvedValue(undefined)

			await expect(
				timesheetPeriodService.createTimesheetPeriod({
					startDate: '2026-07-01',
					endDate: '2026-07-31',
				})
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('getTimesheetPeriodById', () => {
		it('throws 404 when the period does not exist', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetPeriodService.getTimesheetPeriodById(999)
			).rejects.toMatchObject({
				message: 'Timesheet period not found',
				statusCode: 404,
			})
		})

		it('returns the period when found', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(period as never)

			await expect(
				timesheetPeriodService.getTimesheetPeriodById(1)
			).resolves.toEqual(asResponseDTO(period))
		})
	})

	describe('lockTimesheetPeriod', () => {
		it('throws 404 when the period does not exist', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetPeriodService.lockTimesheetPeriod(999, 5)
			).rejects.toMatchObject({ statusCode: 404 })
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('throws 409 when the period is already locked', async () => {
			const lockedInstance = { ...period, isLocked: true }
			timesheetPeriodRepository.findByPk.mockResolvedValue(
				lockedInstance as never
			)

			await expect(
				timesheetPeriodService.lockTimesheetPeriod(1, 5)
			).rejects.toMatchObject({
				message: 'Timesheet period is already locked',
				statusCode: 409,
			})
		})

		it('locks the period, stamping lockedAt/lockedBy', async () => {
			const lockedResult = {
				...period,
				isLocked: true,
				lockedAt: new Date('2026-07-01T00:00:00Z'),
				lockedBy: 5,
				get: jest.fn(),
			}
			lockedResult.get.mockReturnValue(lockedResult)
			const instance = {
				...period,
				isLocked: false,
				update: jest.fn().mockResolvedValue(lockedResult),
			}
			timesheetPeriodRepository.findByPk.mockResolvedValue(instance as never)

			const result = await timesheetPeriodService.lockTimesheetPeriod(1, 5)

			expect(instance.update).toHaveBeenCalledWith(
				expect.objectContaining({ isLocked: true, lockedBy: 5 }),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual(asResponseDTO(lockedResult))
		})
	})

	describe('unlockTimesheetPeriod', () => {
		it('throws 404 when the period does not exist', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetPeriodService.unlockTimesheetPeriod(999)
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('throws 409 when the period is already unlocked', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(period as never)

			await expect(
				timesheetPeriodService.unlockTimesheetPeriod(1)
			).rejects.toMatchObject({
				message: 'Timesheet period is already unlocked',
				statusCode: 409,
			})
		})

		it('unlocks the period, clearing lockedAt/lockedBy', async () => {
			const unlockedResult = {
				...period,
				isLocked: false,
				lockedAt: null,
				lockedBy: null,
				get: jest.fn(),
			}
			unlockedResult.get.mockReturnValue(unlockedResult)
			const instance = {
				...period,
				isLocked: true,
				update: jest.fn().mockResolvedValue(unlockedResult),
			}
			timesheetPeriodRepository.findByPk.mockResolvedValue(instance as never)

			const result = await timesheetPeriodService.unlockTimesheetPeriod(1)

			expect(instance.update).toHaveBeenCalledWith(
				{ isLocked: false, lockedAt: null, lockedBy: null },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual(asResponseDTO(unlockedResult))
		})
	})

	describe('deleteTimesheetPeriod', () => {
		it('returns false when the period does not exist', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(null)

			await expect(
				timesheetPeriodService.deleteTimesheetPeriod(999)
			).resolves.toBe(false)
			expect(timesheetPeriodRepository.delete).not.toHaveBeenCalled()
		})

		it('soft-deletes the period and returns true', async () => {
			timesheetPeriodRepository.findByPk.mockResolvedValue(period as never)
			timesheetPeriodRepository.delete.mockResolvedValue(1)

			await expect(
				timesheetPeriodService.deleteTimesheetPeriod(1)
			).resolves.toBe(true)
			expect(timesheetPeriodRepository.delete).toHaveBeenCalledWith({
				where: { id: 1 },
			})
		})
	})
})
