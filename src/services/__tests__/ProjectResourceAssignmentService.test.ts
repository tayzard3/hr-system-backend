import { Transaction } from 'sequelize'
import { IProjectResourceAssignmentRepository } from '../../interfaces/repository/IProjectResourceAssignmentRepository'
import { IProjectRepository } from '../../interfaces/repository/IProjectRepository'
import { IUserRepository } from '../../interfaces/repository/IUserRepository'
import { IResourceRoleTypeRepository } from '../../interfaces/repository/IResourceRoleTypeRepository'

// ProjectResourceAssignmentService pulls `sequelize` in from '../models' purely
// to call `.transaction(...)` for assignResource/removeResource. Mock the
// whole models module so unit tests never touch a real DB connection (same
// pattern as ProjectService.test.ts).
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
import { ProjectResourceAssignmentService } from '../ProjectResourceAssignmentService'

describe('ProjectResourceAssignmentService', () => {
	let projectResourceAssignmentRepository: jest.Mocked<IProjectResourceAssignmentRepository>
	let projectRepository: jest.Mocked<IProjectRepository>
	let userRepository: jest.Mocked<IUserRepository>
	let resourceRoleTypeRepository: jest.Mocked<IResourceRoleTypeRepository>
	let service: ProjectResourceAssignmentService

	const project = { id: 1, code: 'PRJ-1', name: 'Project One' }
	const user = { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
	const resourceRoleType = { id: 3, name: 'Senior Developer' }

	const assignmentRow = {
		id: 10,
		projectId: 1,
		userId: 2,
		resourceRoleTypeId: 3,
		assignedAt: new Date('2026-06-15T10:00:00.000Z'),
		isActive: true,
	}

	beforeEach(() => {
		jest.clearAllMocks()

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

		projectRepository = {
			findByCode: jest.fn(),
			findByPk: jest.fn(),
			find: jest.fn(),
		} as unknown as jest.Mocked<IProjectRepository>

		userRepository = {
			findByEmail: jest.fn(),
			findByPk: jest.fn(),
		} as unknown as jest.Mocked<IUserRepository>

		resourceRoleTypeRepository = {
			findByName: jest.fn(),
			findByPk: jest.fn(),
		} as unknown as jest.Mocked<IResourceRoleTypeRepository>

		service = new ProjectResourceAssignmentService(
			projectResourceAssignmentRepository,
			projectRepository,
			userRepository,
			resourceRoleTypeRepository
		)
	})

	describe('assignResource', () => {
		const dto = { userId: 2, resourceRoleTypeId: 3 }

		it('throws 404 when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(service.assignResource(1, dto)).rejects.toMatchObject({
				message: 'Project not found',
				statusCode: 404,
			})
			expect(projectResourceAssignmentRepository.create).not.toHaveBeenCalled()
		})

		it('throws 404 when the user does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			userRepository.findByPk.mockResolvedValue(null)

			await expect(service.assignResource(1, dto)).rejects.toMatchObject({
				message: 'User not found',
				statusCode: 404,
			})
			expect(projectResourceAssignmentRepository.create).not.toHaveBeenCalled()
		})

		it('throws 404 when the resource role type does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			userRepository.findByPk.mockResolvedValue(user as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(null)

			await expect(service.assignResource(1, dto)).rejects.toMatchObject({
				message: 'Resource role type not found',
				statusCode: 404,
			})
			expect(projectResourceAssignmentRepository.create).not.toHaveBeenCalled()
		})

		it('throws 409 when the user already has an active assignment on the project', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			userRepository.findByPk.mockResolvedValue(user as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				resourceRoleType as never
			)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				assignmentRow as never
			)

			await expect(service.assignResource(1, dto)).rejects.toMatchObject({
				message: 'User is already assigned to this project',
				statusCode: 409,
			})
			expect(projectResourceAssignmentRepository.create).not.toHaveBeenCalled()
		})

		it('creates the assignment inside a transaction and returns the mapped DTO', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			userRepository.findByPk.mockResolvedValue(user as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				resourceRoleType as never
			)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				null
			)
			projectResourceAssignmentRepository.create.mockResolvedValue(
				assignmentRow as never
			)

			const result = await service.assignResource(1, dto)

			expect(transactionMock).toHaveBeenCalledTimes(1)
			expect(projectResourceAssignmentRepository.create).toHaveBeenCalledWith(
				{ projectId: 1, userId: 2, resourceRoleTypeId: 3 },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual({
				id: 10,
				projectId: 1,
				userId: 2,
				resourceRoleTypeId: 3,
				assignedAt: assignmentRow.assignedAt,
				isActive: true,
			})
		})

		it('throws 500 when the repository fails to persist the assignment', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			userRepository.findByPk.mockResolvedValue(user as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				resourceRoleType as never
			)
			projectResourceAssignmentRepository.findActiveByProjectAndUser.mockResolvedValue(
				null
			)
			projectResourceAssignmentRepository.create.mockResolvedValue(undefined)

			await expect(service.assignResource(1, dto)).rejects.toMatchObject({
				statusCode: 500,
			})
		})
	})

	describe('getProjectAssignments', () => {
		it('throws 404 when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(
				service.getProjectAssignments(1, {})
			).rejects.toMatchObject({ message: 'Project not found', statusCode: 404 })
		})

		it('maps each row to the nested list DTO', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.find.mockResolvedValue([
				{ ...assignmentRow, user, resourceRoleType },
			] as never)

			const result = await service.getProjectAssignments(1, {
				isActive: true,
			})

			expect(projectResourceAssignmentRepository.find).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { projectId: 1, isActive: true },
				})
			)
			expect(result).toEqual([
				{
					id: 10,
					user: { id: 2, fullName: 'Jane Smith', email: 'jane@example.com' },
					resourceRoleType: { id: 3, name: 'Senior Developer' },
					assignedAt: assignmentRow.assignedAt,
					isActive: true,
				},
			])
		})

		it('throws 500 when a row is missing its included associations', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.find.mockResolvedValue([
				{ ...assignmentRow },
			] as never)

			await expect(
				service.getProjectAssignments(1, {})
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('removeResource', () => {
		it('throws 404 when the project does not exist', async () => {
			projectRepository.findByPk.mockResolvedValue(null)

			await expect(service.removeResource(1, 10)).rejects.toMatchObject({
				message: 'Project not found',
				statusCode: 404,
			})
		})

		it('returns false when the assignment does not exist on the project', async () => {
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findOne.mockResolvedValue(null)

			await expect(service.removeResource(1, 999)).resolves.toBe(false)
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('flips isActive to false inside a transaction and returns true', async () => {
			const instance = {
				...assignmentRow,
				update: jest.fn().mockResolvedValue(undefined),
			}
			projectRepository.findByPk.mockResolvedValue(project as never)
			projectResourceAssignmentRepository.findOne.mockResolvedValue(
				instance as never
			)

			await expect(service.removeResource(1, 10)).resolves.toBe(true)
			expect(projectResourceAssignmentRepository.findOne).toHaveBeenCalledWith(
				{ where: { id: 10, projectId: 1 } }
			)
			expect(instance.update).toHaveBeenCalledWith(
				{ isActive: false },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(transactionMock).toHaveBeenCalledTimes(1)
		})
	})
})
