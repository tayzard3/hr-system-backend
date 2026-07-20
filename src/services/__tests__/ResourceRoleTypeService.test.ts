import { Transaction } from 'sequelize'
import { IResourceRoleTypeRepository } from '../../interfaces/repository/IResourceRoleTypeRepository'

// ResourceRoleTypeService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)` for updateResourceRoleType. Mock the whole models module
// so unit tests never touch a real DB connection (same pattern as
// CountryService.test.ts).
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
import { ResourceRoleTypeService } from '../ResourceRoleTypeService'

describe('ResourceRoleTypeService', () => {
	let resourceRoleTypeRepository: jest.Mocked<IResourceRoleTypeRepository>
	let resourceRoleTypeService: ResourceRoleTypeService

	const seniorDeveloper = {
		id: 1,
		name: 'Senior Developer',
		description: 'Senior-level engineering resource',
	}

	beforeEach(() => {
		jest.clearAllMocks()
		resourceRoleTypeRepository = {
			findByName: jest.fn(),
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
		} as unknown as jest.Mocked<IResourceRoleTypeRepository>

		resourceRoleTypeService = new ResourceRoleTypeService(
			resourceRoleTypeRepository
		)
	})

	describe('createResourceRoleType', () => {
		it('throws 409 when a resource role type with the same name already exists', async () => {
			resourceRoleTypeRepository.findByName.mockResolvedValue(
				seniorDeveloper as never
			)

			await expect(
				resourceRoleTypeService.createResourceRoleType({
					name: 'Senior Developer',
				})
			).rejects.toMatchObject({
				message: 'Resource role type with this name already exists',
				statusCode: 409,
			})

			expect(resourceRoleTypeRepository.findByName).toHaveBeenCalledWith(
				'Senior Developer'
			)
			expect(resourceRoleTypeRepository.create).not.toHaveBeenCalled()
		})

		it('trims the name and creates the resource role type', async () => {
			resourceRoleTypeRepository.findByName.mockResolvedValue(null)
			resourceRoleTypeRepository.create.mockResolvedValue(
				seniorDeveloper as never
			)

			const result = await resourceRoleTypeService.createResourceRoleType({
				name: '  Senior Developer  ',
				description: 'Senior-level engineering resource',
			})

			expect(resourceRoleTypeRepository.create).toHaveBeenCalledWith({
				name: 'Senior Developer',
				description: 'Senior-level engineering resource',
			})
			expect(result).toEqual(seniorDeveloper)
		})

		it('throws 500 when the repository fails to persist the resource role type', async () => {
			resourceRoleTypeRepository.findByName.mockResolvedValue(null)
			resourceRoleTypeRepository.create.mockResolvedValue(undefined)

			await expect(
				resourceRoleTypeService.createResourceRoleType({
					name: 'Senior Developer',
				})
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('getResourceRoleTypeById', () => {
		it('throws 404 when the resource role type does not exist', async () => {
			resourceRoleTypeRepository.findByPk.mockResolvedValue(null)

			await expect(
				resourceRoleTypeService.getResourceRoleTypeById(999)
			).rejects.toMatchObject({
				message: 'Resource role type not found',
				statusCode: 404,
			})
		})

		it('returns the resource role type when found', async () => {
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)

			await expect(
				resourceRoleTypeService.getResourceRoleTypeById(1)
			).resolves.toEqual(seniorDeveloper)
		})
	})

	describe('updateResourceRoleType', () => {
		it('returns null when the resource role type does not exist', async () => {
			resourceRoleTypeRepository.findByPk.mockResolvedValue(null)

			const result = await resourceRoleTypeService.updateResourceRoleType(
				999,
				{ name: 'New Name' }
			)

			expect(result).toBeNull()
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('throws 409 when renaming to a name already used by another resource role type', async () => {
			const instance = { ...seniorDeveloper, update: jest.fn() }
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				instance as never
			)
			resourceRoleTypeRepository.findByName.mockResolvedValue({
				id: 2,
				name: 'QA Engineer',
				description: null,
			} as never)

			await expect(
				resourceRoleTypeService.updateResourceRoleType(1, {
					name: 'QA Engineer',
				})
			).rejects.toMatchObject({
				message: 'Resource role type with this name already exists',
				statusCode: 409,
			})
			expect(instance.update).not.toHaveBeenCalled()
		})

		it('allows re-saving with its own existing name, updating the instance directly (no repository.update call)', async () => {
			const updated = { ...seniorDeveloper, description: 'Updated' }
			const instance = {
				...seniorDeveloper,
				update: jest.fn().mockResolvedValue(updated),
			}
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				instance as never
			)
			resourceRoleTypeRepository.findByName.mockResolvedValue(
				instance as never
			)

			const result = await resourceRoleTypeService.updateResourceRoleType(1, {
				name: 'Senior Developer',
				description: 'Updated',
			})

			expect(instance.update).toHaveBeenCalledWith(
				{ name: 'Senior Developer', description: 'Updated' },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(resourceRoleTypeRepository.update).not.toHaveBeenCalled()
			expect(result).toEqual(updated)
		})
	})

	describe('deleteResourceRoleType', () => {
		it('returns false when the resource role type does not exist', async () => {
			resourceRoleTypeRepository.findByPk.mockResolvedValue(null)

			await expect(
				resourceRoleTypeService.deleteResourceRoleType(999)
			).resolves.toBe(false)
			expect(resourceRoleTypeRepository.delete).not.toHaveBeenCalled()
		})

		it('soft-deletes the resource role type and returns true', async () => {
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			resourceRoleTypeRepository.delete.mockResolvedValue(1)

			await expect(
				resourceRoleTypeService.deleteResourceRoleType(1)
			).resolves.toBe(true)
			expect(resourceRoleTypeRepository.delete).toHaveBeenCalledWith({
				where: { id: 1 },
			})
		})
	})

	describe('getAllResourceRoleTypes', () => {
		it('paginates when perPage is provided', async () => {
			resourceRoleTypeRepository.findAndPaginate.mockResolvedValue({
				data: [seniorDeveloper],
				total: 1,
				page: 1,
				perPage: 10,
				totalPages: 1,
			} as never)

			const result = await resourceRoleTypeService.getAllResourceRoleTypes({
				page: 1,
				perPage: 10,
			})

			expect(resourceRoleTypeRepository.findAndPaginate).toHaveBeenCalledWith(
				1,
				10,
				expect.any(Object)
			)
			expect(resourceRoleTypeRepository.find).not.toHaveBeenCalled()
			expect('data' in result && result.data).toEqual([seniorDeveloper])
		})

		it('falls back to an unpaginated find when perPage is not provided', async () => {
			resourceRoleTypeRepository.find.mockResolvedValue([
				seniorDeveloper,
			] as never)

			const result = await resourceRoleTypeService.getAllResourceRoleTypes({
				page: 1,
			})

			expect(resourceRoleTypeRepository.findAndPaginate).not.toHaveBeenCalled()
			expect(Array.isArray(result)).toBe(true)
		})
	})
})
