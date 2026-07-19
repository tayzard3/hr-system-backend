import { ICountryRepository } from '../../interfaces/repository/ICountryRepository'
import { CountryService } from '../CountryService'

describe('CountryService', () => {
	let countryRepository: jest.Mocked<ICountryRepository>
	let countryService: CountryService

	const singapore = { id: 1, code: 'SG', name: 'Singapore' }

	beforeEach(() => {
		countryRepository = {
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
		} as unknown as jest.Mocked<ICountryRepository>

		countryService = new CountryService(countryRepository)
	})

	describe('createCountry', () => {
		it('throws 409 when a country with the same (uppercased) code already exists', async () => {
			countryRepository.findByCode.mockResolvedValue(singapore as never)

			await expect(
				countryService.createCountry({ code: 'sg', name: 'Singapore' })
			).rejects.toMatchObject({
				message: 'Country with this code already exists',
				statusCode: 409,
			})

			expect(countryRepository.findByCode).toHaveBeenCalledWith('SG')
			expect(countryRepository.create).not.toHaveBeenCalled()
		})

		it('normalizes the code to uppercase and creates the country', async () => {
			countryRepository.findByCode.mockResolvedValue(null)
			countryRepository.create.mockResolvedValue(singapore as never)

			const result = await countryService.createCountry({
				code: 'sg',
				name: 'Singapore',
			})

			expect(countryRepository.create).toHaveBeenCalledWith({
				code: 'SG',
				name: 'Singapore',
			})
			expect(result).toEqual(singapore)
		})

		it('throws 500 when the repository fails to persist the country', async () => {
			countryRepository.findByCode.mockResolvedValue(null)
			countryRepository.create.mockResolvedValue(undefined)

			await expect(
				countryService.createCountry({ code: 'SG', name: 'Singapore' })
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('getCountryById', () => {
		it('throws 404 when the country does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(null)

			await expect(countryService.getCountryById(999)).rejects.toMatchObject({
				message: 'Country not found',
				statusCode: 404,
			})
		})

		it('returns the country when found', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)

			await expect(countryService.getCountryById(1)).resolves.toEqual(
				singapore
			)
		})
	})

	describe('updateCountry', () => {
		it('returns null when the country does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(null)

			const result = await countryService.updateCountry(999, {
				name: 'New Name',
			})

			expect(result).toBeNull()
			expect(countryRepository.update).not.toHaveBeenCalled()
		})

		it('throws 409 when renaming to a code already used by another country', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			countryRepository.findByCode.mockResolvedValue({
				id: 2,
				code: 'MY',
				name: 'Malaysia',
			} as never)

			await expect(
				countryService.updateCountry(1, { code: 'my' })
			).rejects.toMatchObject({
				message: 'Country with this code already exists',
				statusCode: 409,
			})
		})

		it('allows re-saving the same country with its own existing code', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			countryRepository.findByCode.mockResolvedValue(singapore as never)
			countryRepository.update.mockResolvedValue([
				1,
				[{ ...singapore, name: 'Singapore Republic' } as never],
			])

			const result = await countryService.updateCountry(1, {
				code: 'sg',
				name: 'Singapore Republic',
			})

			expect(countryRepository.update).toHaveBeenCalledWith(
				{ code: 'SG', name: 'Singapore Republic' },
				expect.objectContaining({ where: { id: 1 }, returning: true })
			)
			expect(result).toEqual({ ...singapore, name: 'Singapore Republic' })
		})
	})

	describe('deleteCountry', () => {
		it('returns false when the country does not exist', async () => {
			countryRepository.findByPk.mockResolvedValue(null)

			await expect(countryService.deleteCountry(999)).resolves.toBe(false)
			expect(countryRepository.delete).not.toHaveBeenCalled()
		})

		it('soft-deletes the country and returns true', async () => {
			countryRepository.findByPk.mockResolvedValue(singapore as never)
			countryRepository.delete.mockResolvedValue(1)

			await expect(countryService.deleteCountry(1)).resolves.toBe(true)
			expect(countryRepository.delete).toHaveBeenCalledWith({
				where: { id: 1 },
			})
		})
	})
})
