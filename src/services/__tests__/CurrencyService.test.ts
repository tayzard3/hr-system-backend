import { Transaction } from 'sequelize'
import { ICurrencyRepository } from '../../interfaces/repository/ICurrencyRepository'

// CurrencyService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)` for updateCurrency. Mock the whole models module so
// unit tests never touch a real DB connection.
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
import { CurrencyService } from '../CurrencyService'

describe('CurrencyService', () => {
	let currencyRepository: jest.Mocked<ICurrencyRepository>
	let currencyService: CurrencyService

	const sgd = {
		id: 1,
		code: 'SGD',
		name: 'Singapore Dollar',
		symbol: 'S$',
		isBaseCurrency: true,
		isActive: true,
	}

	beforeEach(() => {
		currencyRepository = {
			findByCode: jest.fn(),
			findActiveBaseCurrency: jest.fn(),
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
		} as unknown as jest.Mocked<ICurrencyRepository>

		currencyService = new CurrencyService(currencyRepository)
	})

	describe('createCurrency', () => {
		it('throws 409 when a currency with the same (uppercased) code already exists', async () => {
			currencyRepository.findByCode.mockResolvedValue(sgd as never)

			await expect(
				currencyService.createCurrency({
					code: 'sgd',
					name: 'Singapore Dollar',
					symbol: 'S$',
				})
			).rejects.toMatchObject({
				message: 'Currency with this code already exists',
				statusCode: 409,
			})

			expect(currencyRepository.findByCode).toHaveBeenCalledWith('SGD')
			expect(currencyRepository.create).not.toHaveBeenCalled()
		})

		it('throws 409 when creating a second base currency', async () => {
			currencyRepository.findByCode.mockResolvedValue(null)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(
				sgd as never
			)

			await expect(
				currencyService.createCurrency({
					code: 'USD',
					name: 'US Dollar',
					symbol: '$',
					isBaseCurrency: true,
				})
			).rejects.toMatchObject({ statusCode: 409 })

			expect(
				currencyRepository.findActiveBaseCurrency
			).toHaveBeenCalledWith(undefined)
			expect(currencyRepository.create).not.toHaveBeenCalled()
		})

		it('normalizes the code to uppercase and creates the currency', async () => {
			currencyRepository.findByCode.mockResolvedValue(null)
			currencyRepository.create.mockResolvedValue(sgd as never)

			const result = await currencyService.createCurrency({
				code: 'sgd',
				name: 'Singapore Dollar',
				symbol: 'S$',
				isBaseCurrency: true,
			})

			expect(currencyRepository.create).toHaveBeenCalledWith({
				code: 'SGD',
				name: 'Singapore Dollar',
				symbol: 'S$',
				isBaseCurrency: true,
			})
			expect(result).toEqual(sgd)
		})

		it('throws 500 when the repository fails to persist the currency', async () => {
			currencyRepository.findByCode.mockResolvedValue(null)
			currencyRepository.create.mockResolvedValue(undefined)

			await expect(
				currencyService.createCurrency({
					code: 'SGD',
					name: 'Singapore Dollar',
					symbol: 'S$',
				})
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('getCurrencyById', () => {
		it('throws 404 when the currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				currencyService.getCurrencyById(999)
			).rejects.toMatchObject({
				message: 'Currency not found',
				statusCode: 404,
			})
		})

		it('returns the currency when found', async () => {
			currencyRepository.findByPk.mockResolvedValue(sgd as never)

			await expect(currencyService.getCurrencyById(1)).resolves.toEqual(
				sgd
			)
		})
	})

	describe('updateCurrency', () => {
		it('returns null when the currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValue(null)

			const result = await currencyService.updateCurrency(999, {
				name: 'New Name',
			})

			expect(result).toBeNull()
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('throws 409 when renaming to a code already used by another currency', async () => {
			const currencyInstance = { ...sgd, update: jest.fn() }
			currencyRepository.findByPk.mockResolvedValue(
				currencyInstance as never
			)
			currencyRepository.findByCode.mockResolvedValue({
				id: 2,
				code: 'USD',
				name: 'US Dollar',
			} as never)

			await expect(
				currencyService.updateCurrency(1, { code: 'usd' })
			).rejects.toMatchObject({
				message: 'Currency with this code already exists',
				statusCode: 409,
			})
			expect(currencyInstance.update).not.toHaveBeenCalled()
		})

		it('throws 409 when trying to set a second currency as the base currency', async () => {
			const currencyInstance = {
				id: 2,
				code: 'USD',
				name: 'US Dollar',
				symbol: '$',
				isBaseCurrency: false,
				isActive: true,
				update: jest.fn(),
			}
			currencyRepository.findByPk.mockResolvedValue(
				currencyInstance as never
			)
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(
				sgd as never
			)

			await expect(
				currencyService.updateCurrency(2, { isBaseCurrency: true })
			).rejects.toMatchObject({ statusCode: 409 })

			expect(
				currencyRepository.findActiveBaseCurrency
			).toHaveBeenCalledWith(2)
			expect(currencyInstance.update).not.toHaveBeenCalled()
		})

		it('updates the currency and returns the updated instance', async () => {
			const updated = { ...sgd, name: 'Singapore Republic Dollar' }
			const currencyInstance = {
				...sgd,
				update: jest.fn().mockResolvedValue(updated),
			}
			currencyRepository.findByPk.mockResolvedValue(
				currencyInstance as never
			)
			currencyRepository.findByCode.mockResolvedValue(
				currencyInstance as never
			)
			// The repository is responsible for excluding `excludeId` from the
			// lookup (see CurrencyRepository.findActiveBaseCurrency), so from the
			// service's point of view there is no *other* conflicting base
			// currency here.
			currencyRepository.findActiveBaseCurrency.mockResolvedValue(null)

			const result = await currencyService.updateCurrency(1, {
				code: 'sgd',
				name: 'Singapore Republic Dollar',
				isBaseCurrency: true,
			})

			expect(currencyInstance.update).toHaveBeenCalledWith(
				{
					code: 'SGD',
					name: 'Singapore Republic Dollar',
					isBaseCurrency: true,
				},
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(currencyRepository.update).not.toHaveBeenCalled()
			expect(result).toEqual(updated)
		})
	})

	describe('deleteCurrency', () => {
		it('returns false when the currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(currencyService.deleteCurrency(999)).resolves.toBe(
				false
			)
			expect(currencyRepository.delete).not.toHaveBeenCalled()
		})

		it('throws 409 when attempting to delete the active base currency', async () => {
			currencyRepository.findByPk.mockResolvedValue(sgd as never)

			await expect(
				currencyService.deleteCurrency(1)
			).rejects.toMatchObject({ statusCode: 409 })
			expect(currencyRepository.delete).not.toHaveBeenCalled()
		})

		it('soft-deletes a non-base currency and returns true', async () => {
			const usd = { ...sgd, id: 2, code: 'USD', isBaseCurrency: false }
			currencyRepository.findByPk.mockResolvedValue(usd as never)
			currencyRepository.delete.mockResolvedValue(1)

			await expect(currencyService.deleteCurrency(2)).resolves.toBe(true)
			expect(currencyRepository.delete).toHaveBeenCalledWith({
				where: { id: 2 },
			})
		})
	})
})
