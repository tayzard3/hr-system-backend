import { Transaction } from 'sequelize'
import { IExchangeRateRepository } from '../../interfaces/repository/IExchangeRateRepository'
import { ICurrencyRepository } from '../../interfaces/repository/ICurrencyRepository'

// ExchangeRateService pulls `sequelize` in from '../models' purely to call
// `.transaction(...)` for createExchangeRate/updateExchangeRate. Mock the
// whole models module so unit tests never touch a real DB connection (same
// convention as RateCardService.test.ts/CurrencyService.test.ts).
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
import { ExchangeRateService } from '../ExchangeRateService'

describe('ExchangeRateService', () => {
	let exchangeRateRepository: jest.Mocked<IExchangeRateRepository>
	let currencyRepository: jest.Mocked<ICurrencyRepository>
	let exchangeRateService: ExchangeRateService

	const sgd = { id: 1, code: 'SGD', symbol: 'S$' }
	const usd = { id: 2, code: 'USD', symbol: '$' }

	const exchangeRateRow = (overrides: Record<string, unknown> = {}) => ({
		id: 10,
		fromCurrencyId: 1,
		toCurrencyId: 2,
		rate: '0.740000',
		effectiveDate: '2026-06-01',
		isActive: true,
		createdAt: new Date('2026-06-01T00:00:00Z'),
		fromCurrency: sgd,
		toCurrency: usd,
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
		exchangeRateRepository = {
			...baseRepoMock(),
			findActiveByPairAndEffectiveDate: jest.fn(),
			findLatestActiveRate: jest.fn(),
		} as unknown as jest.Mocked<IExchangeRateRepository>

		currencyRepository =
			baseRepoMock() as unknown as jest.Mocked<ICurrencyRepository>

		exchangeRateService = new ExchangeRateService(
			exchangeRateRepository,
			currencyRepository
		)
	})

	describe('createExchangeRate', () => {
		const createDTO = {
			fromCurrencyId: 1,
			toCurrencyId: 2,
			rate: 0.74,
			effectiveDate: '2026-06-01',
		}

		it('throws 400 when fromCurrencyId equals toCurrencyId', async () => {
			await expect(
				exchangeRateService.createExchangeRate({
					...createDTO,
					toCurrencyId: 1,
				})
			).rejects.toMatchObject({
				message: 'fromCurrencyId and toCurrencyId must be different',
				statusCode: 400,
			})
			expect(exchangeRateRepository.create).not.toHaveBeenCalled()
		})

		it('throws 404 when the from currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				exchangeRateService.createExchangeRate(createDTO)
			).rejects.toMatchObject({
				message: 'From currency not found',
				statusCode: 404,
			})
			expect(exchangeRateRepository.create).not.toHaveBeenCalled()
		})

		it('throws 404 when the to currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(null)

			await expect(
				exchangeRateService.createExchangeRate(createDTO)
			).rejects.toMatchObject({
				message: 'To currency not found',
				statusCode: 404,
			})
			expect(exchangeRateRepository.create).not.toHaveBeenCalled()
		})

		it('throws 409 when an active rate already exists for the same pair/effectiveDate', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(usd as never)
			exchangeRateRepository.findActiveByPairAndEffectiveDate.mockResolvedValue(
				exchangeRateRow() as never
			)

			await expect(
				exchangeRateService.createExchangeRate(createDTO)
			).rejects.toMatchObject({ statusCode: 409 })
			expect(exchangeRateRepository.create).not.toHaveBeenCalled()
		})

		it('skips the conflict pre-check when creating an inactive exchange rate', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(usd as never)
			exchangeRateRepository.create.mockResolvedValue(
				exchangeRateRow({ isActive: false }) as never
			)

			await exchangeRateService.createExchangeRate({
				...createDTO,
				isActive: false,
			})

			expect(
				exchangeRateRepository.findActiveByPairAndEffectiveDate
			).not.toHaveBeenCalled()
		})

		it('creates the exchange rate and returns the mapped DTO', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(usd as never)
			exchangeRateRepository.findActiveByPairAndEffectiveDate.mockResolvedValue(
				null
			)
			exchangeRateRepository.create.mockResolvedValue(
				exchangeRateRow() as never
			)

			const result = await exchangeRateService.createExchangeRate(createDTO)

			expect(exchangeRateRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					fromCurrencyId: 1,
					toCurrencyId: 2,
					rate: '0.740000',
					effectiveDate: '2026-06-01',
					isActive: true,
				}),
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result).toEqual({
				id: 10,
				fromCurrency: sgd,
				toCurrency: usd,
				rate: 0.74,
				effectiveDate: '2026-06-01',
				isActive: true,
				createdAt: exchangeRateRow().createdAt,
			})
		})

		it('throws 500 when the repository fails to persist the exchange rate', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(usd as never)
			exchangeRateRepository.findActiveByPairAndEffectiveDate.mockResolvedValue(
				null
			)
			exchangeRateRepository.create.mockResolvedValue(undefined)

			await expect(
				exchangeRateService.createExchangeRate(createDTO)
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('getExchangeRateById', () => {
		it('throws 404 when the exchange rate does not exist', async () => {
			exchangeRateRepository.findByPk.mockResolvedValue(null)

			await expect(
				exchangeRateService.getExchangeRateById(999)
			).rejects.toMatchObject({
				message: 'Exchange rate not found',
				statusCode: 404,
			})
		})

		it('returns the mapped exchange rate when found', async () => {
			exchangeRateRepository.findByPk.mockResolvedValue(
				exchangeRateRow() as never
			)

			await expect(
				exchangeRateService.getExchangeRateById(10)
			).resolves.toEqual({
				id: 10,
				fromCurrency: sgd,
				toCurrency: usd,
				rate: 0.74,
				effectiveDate: '2026-06-01',
				isActive: true,
				createdAt: exchangeRateRow().createdAt,
			})
		})
	})

	describe('getAllExchangeRates', () => {
		it('maps paginated rows into response DTOs', async () => {
			exchangeRateRepository.findAndPaginate.mockResolvedValue({
				data: [exchangeRateRow()],
				currentPage: 1,
				perPage: 20,
				totalResults: 1,
				totalPages: 1,
				hasPreviousPage: false,
				hasNextPage: false,
				total: 1,
			} as never)

			const result = await exchangeRateService.getAllExchangeRates({
				page: 1,
				perPage: 20,
			})

			expect(result.data).toEqual([
				{
					id: 10,
					fromCurrency: sgd,
					toCurrency: usd,
					rate: 0.74,
					effectiveDate: '2026-06-01',
					isActive: true,
					createdAt: exchangeRateRow().createdAt,
				},
			])
			expect(result.total).toBe(1)
		})
	})

	describe('updateExchangeRate', () => {
		it('returns null when the exchange rate does not exist', async () => {
			exchangeRateRepository.findByPk.mockResolvedValue(null)

			const result = await exchangeRateService.updateExchangeRate(999, {
				rate: 0.75,
			})

			expect(result).toBeNull()
			expect(transactionMock).not.toHaveBeenCalled()
		})

		it('throws 409 when reactivating into a conflicting pair/effectiveDate', async () => {
			const instance = exchangeRateRow({ isActive: false })
			exchangeRateRepository.findByPk.mockResolvedValue(instance as never)
			exchangeRateRepository.findActiveByPairAndEffectiveDate.mockResolvedValue(
				exchangeRateRow({ id: 11 }) as never
			)

			await expect(
				exchangeRateService.updateExchangeRate(10, { isActive: true })
			).rejects.toMatchObject({ statusCode: 409 })
			expect(instance.update).not.toHaveBeenCalled()
			expect(
				exchangeRateRepository.findActiveByPairAndEffectiveDate
			).toHaveBeenCalledWith(1, 2, '2026-06-01', 10)
		})

		it('updates the exchange rate and returns the mapped DTO', async () => {
			const updatedRow = exchangeRateRow({ rate: '0.750000' })
			const instance = exchangeRateRow({
				update: jest.fn().mockResolvedValue(updatedRow),
			})
			exchangeRateRepository.findByPk.mockResolvedValue(instance as never)
			exchangeRateRepository.findActiveByPairAndEffectiveDate.mockResolvedValue(
				null
			)

			const result = await exchangeRateService.updateExchangeRate(10, {
				rate: 0.75,
			})

			expect(instance.update).toHaveBeenCalledWith(
				{ rate: '0.750000' },
				expect.objectContaining({ transaction: expect.anything() })
			)
			expect(result?.rate).toBe(0.75)
		})

		it('does not re-check for conflicts when neither effectiveDate nor isActive change', async () => {
			const instance = exchangeRateRow({
				update: jest.fn().mockResolvedValue(exchangeRateRow()),
			})
			exchangeRateRepository.findByPk.mockResolvedValue(instance as never)

			await exchangeRateService.updateExchangeRate(10, { rate: 0.75 })

			expect(
				exchangeRateRepository.findActiveByPairAndEffectiveDate
			).not.toHaveBeenCalled()
		})
	})

	describe('deleteExchangeRate', () => {
		it('returns false when the exchange rate does not exist', async () => {
			exchangeRateRepository.findByPk.mockResolvedValue(null)

			await expect(exchangeRateService.deleteExchangeRate(999)).resolves.toBe(
				false
			)
			expect(exchangeRateRepository.delete).not.toHaveBeenCalled()
		})

		it('soft-deletes the exchange rate and returns true', async () => {
			exchangeRateRepository.findByPk.mockResolvedValue(
				exchangeRateRow() as never
			)
			exchangeRateRepository.delete.mockResolvedValue(1)

			await expect(exchangeRateService.deleteExchangeRate(10)).resolves.toBe(
				true
			)
			expect(exchangeRateRepository.delete).toHaveBeenCalledWith({
				where: { id: 10 },
			})
		})
	})

	describe('getLatestExchangeRate', () => {
		it('throws 404 when the from currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValue(null)

			await expect(
				exchangeRateService.getLatestExchangeRate({
					fromCurrencyId: 1,
					toCurrencyId: 2,
				})
			).rejects.toMatchObject({
				message: 'From currency not found',
				statusCode: 404,
			})
		})

		it('throws 404 when the to currency does not exist', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(null)

			await expect(
				exchangeRateService.getLatestExchangeRate({
					fromCurrencyId: 1,
					toCurrencyId: 2,
				})
			).rejects.toMatchObject({
				message: 'To currency not found',
				statusCode: 404,
			})
		})

		it('throws 404 when no active exchange rate is found', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(usd as never)
			exchangeRateRepository.findLatestActiveRate.mockResolvedValue(null)

			await expect(
				exchangeRateService.getLatestExchangeRate({
					fromCurrencyId: 1,
					toCurrencyId: 2,
				})
			).rejects.toMatchObject({ statusCode: 404 })
		})

		it('looks up the latest active rate as of today and returns the mapped DTO', async () => {
			currencyRepository.findByPk.mockResolvedValueOnce(sgd as never)
			currencyRepository.findByPk.mockResolvedValueOnce(usd as never)
			exchangeRateRepository.findLatestActiveRate.mockResolvedValue(
				exchangeRateRow() as never
			)

			const result = await exchangeRateService.getLatestExchangeRate({
				fromCurrencyId: 1,
				toCurrencyId: 2,
			})

			const todayIso = new Date().toISOString().slice(0, 10)
			expect(exchangeRateRepository.findLatestActiveRate).toHaveBeenCalledWith(
				1,
				2,
				todayIso
			)
			expect(result).toEqual({
				id: 10,
				fromCurrency: sgd,
				toCurrency: usd,
				rate: 0.74,
				effectiveDate: '2026-06-01',
				isActive: true,
				createdAt: exchangeRateRow().createdAt,
			})
		})
	})
})
