import { Transaction } from 'sequelize'
import { IRateCardRepository } from '../../interfaces/repository/IRateCardRepository'
import { ICountryRepository } from '../../interfaces/repository/ICountryRepository'
import { IResourceRoleTypeRepository } from '../../interfaces/repository/IResourceRoleTypeRepository'
import { ICurrencyRepository } from '../../interfaces/repository/ICurrencyRepository'

// RateCardService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)` for createRateCard/updateRateCard. Mock the whole
// models module so unit tests never touch a real DB connection (same
// convention as CurrencyService.test.ts/TimesheetPeriodService.test.ts).
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
import { RateCardService } from '../RateCardService'

describe('RateCardService', () => {
	let rateCardRepository: jest.Mocked<IRateCardRepository>
	let countryRepository: jest.Mocked<ICountryRepository>
	let resourceRoleTypeRepository: jest.Mocked<IResourceRoleTypeRepository>
	let currencyRepository: jest.Mocked<ICurrencyRepository>
	let rateCardService: RateCardService

	const singapore = { id: 1, code: 'SG', name: 'Singapore' }
	const seniorDeveloper = { id: 2, name: 'Senior Developer' }
	const sgd = { id: 3, code: 'SGD', symbol: 'S$' }

	const rateCardRow = (overrides: Record<string, unknown> = {}) => ({
		id: 10,
		countryId: 1,
		resourceRoleTypeId: 2,
		currencyId: 3,
		billingRate: '120.00',
		costRate: '120.00',
		effectiveDate: '2026-01-01',
		isActive: true,
		country: singapore,
		resourceRoleType: seniorDeveloper,
		currency: sgd,
		update: jest.fn(),
		...overrides,
	})

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

	beforeEach(() => {
		rateCardRepository = {
			...baseRepoMock(),
			findActiveByCountryRoleAndEffectiveDate: jest.fn(),
			findEffectiveRateCard: jest.fn(),
		} as unknown as jest.Mocked<IRateCardRepository>

		countryRepository = baseRepoMock() as unknown as jest.Mocked<ICountryRepository>
		resourceRoleTypeRepository =
			baseRepoMock() as unknown as jest.Mocked<IResourceRoleTypeRepository>
		currencyRepository = baseRepoMock() as unknown as jest.Mocked<ICurrencyRepository>

		rateCardService = new RateCardService(
			rateCardRepository,
			countryRepository,
			resourceRoleTypeRepository,
			currencyRepository
		)
	})

	describe('createRateCard', () => {
		const createDTO = {
			countryId: 1,
			resourceRoleTypeId: 2,
			currencyId: 3,
			hourlyRate: 120,
			effectiveDate: '2026-01-01',
		}

		it('throws 404 when the country does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.createRateCard(createDTO)
			).rejects.toMatchObject({ message: 'Country not found', statusCode: 404 })
			expect(rateCardRepository.create).not.toHaveBeenCalled()
		})

		it('throws 404 when the resource role type does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.createRateCard(createDTO)
			).rejects.toMatchObject({
				message: 'Resource role type not found',
				statusCode: 404,
			})
			expect(rateCardRepository.create).not.toHaveBeenCalled()
		})

		it('throws 404 when the currency does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.createRateCard(createDTO)
			).rejects.toMatchObject({ message: 'Currency not found', statusCode: 404 })
			expect(rateCardRepository.create).not.toHaveBeenCalled()
		})

		it('throws 409 when an active rate card already exists for the same country/role/effectiveDate', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			rateCardRepository.findActiveByCountryRoleAndEffectiveDate.mockResolvedValue(
				rateCardRow() as never
			)

			await expect(
				rateCardService.createRateCard(createDTO)
			).rejects.toMatchObject({ statusCode: 409 })
			expect(rateCardRepository.create).not.toHaveBeenCalled()
		})

		it('skips the conflict pre-check when creating an inactive rate card', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			rateCardRepository.create.mockResolvedValue(
				rateCardRow({ isActive: false }) as never
			)

			await rateCardService.createRateCard({
				...createDTO,
				isActive: false,
			})

			expect(
				rateCardRepository.findActiveByCountryRoleAndEffectiveDate
			).not.toHaveBeenCalled()
		})

		it('defaults costRate to hourlyRate when costRate is not supplied', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			rateCardRepository.findActiveByCountryRoleAndEffectiveDate.mockResolvedValue(
				null
			)
			rateCardRepository.create.mockResolvedValue(rateCardRow() as never)

			const result = await rateCardService.createRateCard(createDTO)

			expect(rateCardRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					countryId: 1,
					resourceRoleTypeId: 2,
					currencyId: 3,
					billingRate: '120.00',
					costRate: '120.00',
					effectiveDate: '2026-01-01',
					isActive: true,
				}),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual({
				id: 10,
				country: singapore,
				resourceRoleType: seniorDeveloper,
				currency: sgd,
				hourlyRate: 120,
				effectiveDate: '2026-01-01',
				isActive: true,
			})
		})

		it('uses the explicitly supplied costRate when provided', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			rateCardRepository.findActiveByCountryRoleAndEffectiveDate.mockResolvedValue(
				null
			)
			rateCardRepository.create.mockResolvedValue(rateCardRow() as never)

			await rateCardService.createRateCard({ ...createDTO, costRate: 90 })

			expect(rateCardRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ costRate: '90.00' }),
				expect.anything()
			)
		})

		it('throws 500 when the repository fails to persist the rate card', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)
			rateCardRepository.findActiveByCountryRoleAndEffectiveDate.mockResolvedValue(
				null
			)
			rateCardRepository.create.mockResolvedValue(undefined)

			await expect(
				rateCardService.createRateCard(createDTO)
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('getRateCardById', () => {
		it('throws 404 when the rate card does not exist', async () => {
			rateCardRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.getRateCardById(999)
			).rejects.toMatchObject({
				message: 'Rate card not found',
				statusCode: 404,
			})
		})

		it('returns the mapped rate card when found', async () => {
			rateCardRepository.findByPk.mockResolvedValue(rateCardRow() as never)

			await expect(rateCardService.getRateCardById(10)).resolves.toEqual({
				id: 10,
				country: singapore,
				resourceRoleType: seniorDeveloper,
				currency: sgd,
				hourlyRate: 120,
				effectiveDate: '2026-01-01',
				isActive: true,
			})
		})
	})

	describe('getAllRateCards', () => {
		it('maps paginated rows into response DTOs', async () => {
			rateCardRepository.findAndPaginate.mockResolvedValue({
				data: [rateCardRow()],
				currentPage: 1,
				perPage: 20,
				totalResults: 1,
				totalPages: 1,
				hasPreviousPage: false,
				hasNextPage: false,
				total: 1,
			} as never)

			const result = await rateCardService.getAllRateCards({
				page: 1,
				perPage: 20,
			})

			expect(result.data).toEqual([
				{
					id: 10,
					country: singapore,
					resourceRoleType: seniorDeveloper,
					currency: sgd,
					hourlyRate: 120,
					effectiveDate: '2026-01-01',
					isActive: true,
				},
			])
			expect(result.total).toBe(1)
		})
	})

	describe('updateRateCard', () => {
		it('returns null when the rate card does not exist', async () => {
			rateCardRepository.findByPk.mockResolvedValue(null)

			const result = await rateCardService.updateRateCard(999, {
				hourlyRate: 130,
			})

			expect(result).toBeNull()
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('throws 404 when updating to a currency that does not exist', async () => {
			rateCardRepository.findByPk.mockResolvedValue(rateCardRow() as never)
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.updateRateCard(10, { currencyId: 99 })
			).rejects.toMatchObject({ message: 'Currency not found', statusCode: 404 })
		})

		it('throws 409 when reactivating into a conflicting country/role/effectiveDate', async () => {
			const instance = rateCardRow({ isActive: false })
			rateCardRepository.findByPk.mockResolvedValue(instance as never)
			rateCardRepository.findActiveByCountryRoleAndEffectiveDate.mockResolvedValue(
				rateCardRow({ id: 11 }) as never
			)

			await expect(
				rateCardService.updateRateCard(10, { isActive: true })
			).rejects.toMatchObject({ statusCode: 409 })
			expect(instance.update).not.toHaveBeenCalled()
			expect(
				rateCardRepository.findActiveByCountryRoleAndEffectiveDate
			).toHaveBeenCalledWith(1, 2, '2026-01-01', 10)
		})

		it('updates the rate card and returns the mapped DTO', async () => {
			const updatedRow = rateCardRow({ billingRate: '150.00' })
			const instance = rateCardRow({
				update: jest.fn().mockResolvedValue(updatedRow),
			})
			rateCardRepository.findByPk.mockResolvedValue(instance as never)
			rateCardRepository.findActiveByCountryRoleAndEffectiveDate.mockResolvedValue(
				null
			)

			const result = await rateCardService.updateRateCard(10, {
				hourlyRate: 150,
			})

			expect(instance.update).toHaveBeenCalledWith(
				{ billingRate: '150.00' },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result?.hourlyRate).toBe(150)
		})

		it('does not re-check for conflicts when neither effectiveDate nor isActive change', async () => {
			const instance = rateCardRow({
				update: jest.fn().mockResolvedValue(rateCardRow()),
			})
			rateCardRepository.findByPk.mockResolvedValue(instance as never)

			await rateCardService.updateRateCard(10, { hourlyRate: 150 })

			expect(
				rateCardRepository.findActiveByCountryRoleAndEffectiveDate
			).not.toHaveBeenCalled()
		})
	})

	describe('deleteRateCard', () => {
		it('returns false when the rate card does not exist', async () => {
			rateCardRepository.findByPk.mockResolvedValue(null)

			await expect(rateCardService.deleteRateCard(999)).resolves.toBe(false)
			expect(rateCardRepository.delete).not.toHaveBeenCalled()
		})

		it('soft-deletes the rate card and returns true', async () => {
			rateCardRepository.findByPk.mockResolvedValue(rateCardRow() as never)
			rateCardRepository.delete.mockResolvedValue(1)

			await expect(rateCardService.deleteRateCard(10)).resolves.toBe(true)
			expect(rateCardRepository.delete).toHaveBeenCalledWith({
				where: { id: 10 },
			})
		})
	})

	describe('lookupRateCard', () => {
		it('throws 404 when the country does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.lookupRateCard({
					countryId: 1,
					resourceRoleTypeId: 2,
				})
			).rejects.toMatchObject({ message: 'Country not found', statusCode: 404 })
		})

		it('throws 404 when the resource role type does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(null)

			await expect(
				rateCardService.lookupRateCard({
					countryId: 1,
					resourceRoleTypeId: 2,
				})
			).rejects.toMatchObject({
				message: 'Resource role type not found',
				statusCode: 404,
			})
		})

		it('throws 404 when no effective rate card is found', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue(null)

			await expect(
				rateCardService.lookupRateCard({
					countryId: 1,
					resourceRoleTypeId: 2,
				})
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('defaults asOfDate to today when not supplied', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue(
				rateCardRow() as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)

			await rateCardService.lookupRateCard({
				countryId: 1,
				resourceRoleTypeId: 2,
			})

			const todayIso = new Date().toISOString().slice(0, 10)
			expect(rateCardRepository.findEffectiveRateCard).toHaveBeenCalledWith(
				1,
				2,
				todayIso
			)
		})

		it('returns the mapped effective rate card for a given asOfDate', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			resourceRoleTypeRepository.findByPk.mockResolvedValue(
				seniorDeveloper as never
			)
			rateCardRepository.findEffectiveRateCard.mockResolvedValue(
				rateCardRow() as never
			)
			currencyRepository.findByPk.mockResolvedValue(sgd as never)

			const result = await rateCardService.lookupRateCard({
				countryId: 1,
				resourceRoleTypeId: 2,
				asOfDate: '2026-06-01',
			})

			expect(rateCardRepository.findEffectiveRateCard).toHaveBeenCalledWith(
				1,
				2,
				'2026-06-01'
			)
			expect(result).toEqual({
				id: 10,
				country: singapore,
				resourceRoleType: seniorDeveloper,
				currency: sgd,
				hourlyRate: 120,
				effectiveDate: '2026-01-01',
				isActive: true,
			})
		})
	})
})
