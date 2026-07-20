import { Transaction } from 'sequelize'
import { IProjectRepository } from '../../interfaces/repository/IProjectRepository'

// ProjectService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)` for createProject/updateProject/deleteProject. Mock the
// whole models module so unit tests never touch a real DB connection
// (same pattern as CountryService.test.ts).
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
import { ProjectService } from '../ProjectService'

describe('ProjectService', () => {
	let projectRepository: jest.Mocked<IProjectRepository>
	let projectService: ProjectService

	const toPlain = (data: Record<string, unknown>) => ({
		get: jest.fn(({ plain }: { plain: boolean }) =>
			plain ? data : data
		),
		...data,
	})

	const projectRow = {
		id: 1,
		code: 'PRJ-1',
		name: 'Project One',
		description: null,
		clientName: null,
		clientEmail: null,
		startDate: '2026-01-01',
		endDate: null,
		maxDailyHours: '8.00',
		isActive: true,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
	}

	beforeEach(() => {
		jest.clearAllMocks()
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

		projectService = new ProjectService(projectRepository)
	})

	describe('createProject', () => {
		const dto = {
			code: 'prj-1',
			name: 'Project One',
			startDate: '2026-01-01',
			endDate: null,
		}

		it('throws 409 when a project with the same code already exists', async () => {
			projectRepository.findByCode.mockResolvedValue(
				toPlain(projectRow) as never
			)

			await expect(projectService.createProject(dto)).rejects.toMatchObject(
				{
					message: 'Project with this code already exists',
					statusCode: 409,
				}
			)
			expect(projectRepository.create).not.toHaveBeenCalled()
		})

		it('throws 400 when endDate is before startDate', async () => {
			projectRepository.findByCode.mockResolvedValue(null)

			await expect(
				projectService.createProject({
					...dto,
					startDate: '2026-05-01',
					endDate: '2026-01-01',
				})
			).rejects.toMatchObject({
				message: 'endDate cannot be before startDate',
				statusCode: 400,
			})
			expect(projectRepository.create).not.toHaveBeenCalled()
		})

		it('trims the code, wraps the write in a transaction, and returns the mapped DTO', async () => {
			projectRepository.findByCode.mockResolvedValue(null)
			projectRepository.create.mockResolvedValue(toPlain(projectRow) as never)

			const result = await projectService.createProject({
				...dto,
				code: '  prj-1  ',
				maxDailyHours: 6,
			})

			expect(transactionMock).toHaveBeenCalledTimes(1)
			expect(projectRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ code: 'prj-1', maxDailyHours: '6.00' }),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result.maxDailyHours).toBe(8) // parsed back to a number
			expect(result.id).toBe(1)
		})

		it('throws 500 when the repository fails to persist the project', async () => {
			projectRepository.findByCode.mockResolvedValue(null)
			projectRepository.create.mockResolvedValue(undefined)

			await expect(projectService.createProject(dto)).rejects.toMatchObject({
				statusCode: 500,
			})
		})
	})

	describe('getProjectById', () => {
		it('throws 404 when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(projectService.getProjectById(999)).rejects.toMatchObject(
				{ message: 'Project not found', statusCode: 404 }
			)
		})

		it('returns the mapped DTO when found', async () => {
			projectRepository.findByPk.mockResolvedValue(
				toPlain(projectRow) as never
			)

			const result = await projectService.getProjectById(1)
			expect(result.code).toBe('PRJ-1')
			expect(result.maxDailyHours).toBe(8)
		})
	})

	describe('updateProject', () => {
		it('returns null when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			const result = await projectService.updateProject(999, {
				name: 'New Name',
			})

			expect(result).toBeNull()
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('throws 409 when renaming to a code already used by another project', async () => {
			const instance = { ...toPlain(projectRow), update: jest.fn() }
			projectRepository.findByPk.mockResolvedValue(instance as never)
			projectRepository.findByCode.mockResolvedValue(
				toPlain({ ...projectRow, id: 2, code: 'PRJ-2' }) as never
			)

			await expect(
				projectService.updateProject(1, { code: 'PRJ-2' })
			).rejects.toMatchObject({
				message: 'Project with this code already exists',
				statusCode: 409,
			})
			expect(instance.update).not.toHaveBeenCalled()
		})

		it('allows keeping its own existing code and updates the instance directly (no repository.update call)', async () => {
			const updatedPlain = { ...projectRow, name: 'Renamed' }
			const instance = {
				...toPlain(projectRow),
				update: jest.fn().mockResolvedValue(toPlain(updatedPlain)),
			}
			projectRepository.findByPk.mockResolvedValue(instance as never)
			projectRepository.findByCode.mockResolvedValue(instance as never)

			const result = await projectService.updateProject(1, {
				code: 'PRJ-1',
				name: 'Renamed',
			})

			expect(instance.update).toHaveBeenCalledWith(
				expect.objectContaining({ code: 'PRJ-1', name: 'Renamed' }),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(projectRepository.update).not.toHaveBeenCalled()
			expect(result?.name).toBe('Renamed')
		})

		it('validates the date range against the persisted startDate when only endDate is supplied', async () => {
			const instance = {
				...toPlain({ ...projectRow, startDate: '2026-06-01' }),
				update: jest.fn(),
			}
			projectRepository.findByPk.mockResolvedValue(instance as never)

			await expect(
				projectService.updateProject(1, { endDate: '2026-01-01' })
			).rejects.toMatchObject({
				message: 'endDate cannot be before startDate',
				statusCode: 400,
			})
			expect(instance.update).not.toHaveBeenCalled()
		})
	})

	describe('deleteProject', () => {
		it('returns false when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(projectService.deleteProject(999)).resolves.toBe(false)
			expect(projectRepository.delete).not.toHaveBeenCalled()
		})

		it('deactivates and soft-deletes the project inside a single transaction', async () => {
			const instance = {
				...toPlain(projectRow),
				update: jest.fn().mockResolvedValue(undefined),
			}
			projectRepository.findByPk.mockResolvedValue(instance as never)
			projectRepository.delete.mockResolvedValue(1)

			await expect(projectService.deleteProject(1)).resolves.toBe(true)
			expect(instance.update).toHaveBeenCalledWith(
				{ isActive: false },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(projectRepository.delete).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 1 },
					transaction: expect.anything(),
				})
			)
			expect(transactionMock).toHaveBeenCalledTimes(1)
		})
	})

	describe('getAllProjects', () => {
		it('paginates when perPage is provided and maps each row to a response DTO', async () => {
			projectRepository.findAndPaginate.mockResolvedValue({
				data: [toPlain(projectRow)],
				total: 1,
				page: 1,
				perPage: 10,
				totalPages: 1,
			} as never)

			const result = await projectService.getAllProjects({
				page: 1,
				perPage: 10,
			})

			expect(projectRepository.findAndPaginate).toHaveBeenCalledWith(
				1,
				10,
				expect.any(Object)
			)
			expect(projectRepository.find).not.toHaveBeenCalled()
			expect('data' in result && result.data[0].maxDailyHours).toBe(8)
		})

		it('falls back to an unpaginated find when perPage is not provided', async () => {
			projectRepository.find.mockResolvedValue([
				toPlain(projectRow),
			] as never)

			const result = await projectService.getAllProjects({ page: 1 })

			expect(projectRepository.findAndPaginate).not.toHaveBeenCalled()
			expect(Array.isArray(result)).toBe(true)
		})
	})
})
