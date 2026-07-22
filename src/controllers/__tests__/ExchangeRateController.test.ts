import express, { Application } from 'express'
import request from 'supertest'
import { ExchangeRateController } from '../ExchangeRateController'
import { IExchangeRateService } from '../../interfaces/service/IExchangeRateService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createExchangeRateSchema,
	updateExchangeRateSchema,
} from '../../validation/exchangeRateSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way exchangeRateRoutes.ts wires the real
// routes (validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked IExchangeRateService so no DI
// container / real DB is involved (same convention as
// RateCardController.test.ts).
describe('ExchangeRateController', () => {
	let exchangeRateServiceMock: jest.Mocked<IExchangeRateService>
	let app: Application

	const exchangeRateDTO = {
		id: 10,
		fromCurrency: { id: 1, code: 'SGD', symbol: 'S$' },
		toCurrency: { id: 2, code: 'USD', symbol: '$' },
		rate: 0.74,
		effectiveDate: '2026-06-01',
		isActive: true,
		createdAt: new Date('2026-06-01T00:00:00Z'),
	}

	beforeEach(() => {
		exchangeRateServiceMock = {
			getAllExchangeRates: jest.fn(),
			getExchangeRateById: jest.fn(),
			createExchangeRate: jest.fn(),
			updateExchangeRate: jest.fn(),
			deleteExchangeRate: jest.fn(),
			getLatestExchangeRate: jest.fn(),
		} as unknown as jest.Mocked<IExchangeRateService>

		const exchangeRateController = new ExchangeRateController(
			exchangeRateServiceMock
		)

		app = express()
		app.use(express.json())
		app
			.route('/exchange-rates/latest')
			.get(exchangeRateController.getLatestExchangeRate)
		app
			.route('/exchange-rates')
			.get(exchangeRateController.getAllExchangeRates)
			.post(
				zodSchemaValidator(createExchangeRateSchema),
				exchangeRateController.createExchangeRate
			)
		app
			.route('/exchange-rates/:id')
			.get(exchangeRateController.getExchangeRateById)
			.put(
				zodSchemaValidator(updateExchangeRateSchema),
				exchangeRateController.updateExchangeRate
			)
			.delete(exchangeRateController.deleteExchangeRate)
		app.use(globalErrorHandler)
	})

	describe('GET /exchange-rates', () => {
		it('returns the paginated list of exchange rates', async () => {
			exchangeRateServiceMock.getAllExchangeRates.mockResolvedValue({
				data: [exchangeRateDTO],
				total: 1,
			} as never)

			const res = await request(app).get('/exchange-rates')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data.data).toEqual([
				{ ...exchangeRateDTO, createdAt: exchangeRateDTO.createdAt.toISOString() },
			])
		})

		it('parses filter query params through to the service', async () => {
			exchangeRateServiceMock.getAllExchangeRates.mockResolvedValue({
				data: [],
				total: 0,
			} as never)

			await request(app).get(
				'/exchange-rates?fromCurrencyId=1&toCurrencyId=2&isActive=true&effectiveDate=2026-06-01'
			)

			expect(exchangeRateServiceMock.getAllExchangeRates).toHaveBeenCalledWith(
				expect.objectContaining({
					fromCurrencyId: 1,
					toCurrencyId: 2,
					isActive: true,
					effectiveDate: '2026-06-01',
				})
			)
		})
	})

	describe('POST /exchange-rates', () => {
		const validBody = {
			fromCurrencyId: 1,
			toCurrencyId: 2,
			rate: 0.74,
			effectiveDate: '2026-06-01',
		}

		it('returns 422 when rate is not positive', async () => {
			const res = await request(app)
				.post('/exchange-rates')
				.send({ ...validBody, rate: 0 })

			expect(res.body.statusCode).toBe(422)
			expect(exchangeRateServiceMock.createExchangeRate).not.toHaveBeenCalled()
		})

		it('returns 422 when fromCurrencyId equals toCurrencyId', async () => {
			const res = await request(app)
				.post('/exchange-rates')
				.send({ ...validBody, toCurrencyId: 1 })

			expect(res.body.statusCode).toBe(422)
			expect(exchangeRateServiceMock.createExchangeRate).not.toHaveBeenCalled()
		})

		it('returns 422 when effectiveDate is not YYYY-MM-DD', async () => {
			const res = await request(app)
				.post('/exchange-rates')
				.send({ ...validBody, effectiveDate: '01-06-2026' })

			expect(res.body.statusCode).toBe(422)
			expect(exchangeRateServiceMock.createExchangeRate).not.toHaveBeenCalled()
		})

		it('creates the exchange rate and returns 201 on success', async () => {
			exchangeRateServiceMock.createExchangeRate.mockResolvedValue(
				exchangeRateDTO as never
			)

			const res = await request(app).post('/exchange-rates').send(validBody)

			expect(exchangeRateServiceMock.createExchangeRate).toHaveBeenCalledWith(
				expect.objectContaining(validBody)
			)
			expect(res.body.statusCode).toBe(201)
		})

		it('propagates a domain AppException (e.g. active rate conflict) through the central error handler', async () => {
			exchangeRateServiceMock.createExchangeRate.mockRejectedValue(
				new AppException(
					'An active exchange rate already exists for this currency pair and effective date',
					409
				)
			)

			const res = await request(app).post('/exchange-rates').send(validBody)

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /exchange-rates/:id', () => {
		it('returns the exchange rate when found', async () => {
			exchangeRateServiceMock.getExchangeRateById.mockResolvedValue(
				exchangeRateDTO as never
			)

			const res = await request(app).get('/exchange-rates/10')

			expect(exchangeRateServiceMock.getExchangeRateById).toHaveBeenCalledWith(
				10
			)
			expect(res.body.statusCode).toBe(200)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			exchangeRateServiceMock.getExchangeRateById.mockRejectedValue(
				new AppException('Exchange rate not found', 404)
			)

			const res = await request(app).get('/exchange-rates/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /exchange-rates/:id (update)', () => {
		it('returns 422 when the body is empty', async () => {
			const res = await request(app).put('/exchange-rates/10').send({})

			expect(res.body.statusCode).toBe(422)
			expect(exchangeRateServiceMock.updateExchangeRate).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the exchange rate was not found', async () => {
			exchangeRateServiceMock.updateExchangeRate.mockResolvedValue(null)

			const res = await request(app)
				.put('/exchange-rates/999')
				.send({ rate: 0.75 })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the exchange rate and returns 200 on success', async () => {
			const updated = { ...exchangeRateDTO, rate: 0.75 }
			exchangeRateServiceMock.updateExchangeRate.mockResolvedValue(
				updated as never
			)

			const res = await request(app)
				.put('/exchange-rates/10')
				.send({ rate: 0.75 })

			expect(exchangeRateServiceMock.updateExchangeRate).toHaveBeenCalledWith(
				10,
				expect.objectContaining({ rate: 0.75 })
			)
			expect(res.body.statusCode).toBe(200)
		})
	})

	describe('DELETE /exchange-rates/:id', () => {
		it('returns 404 when the exchange rate does not exist', async () => {
			exchangeRateServiceMock.deleteExchangeRate.mockResolvedValue(false)

			const res = await request(app).delete('/exchange-rates/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the exchange rate and returns the exact spec message on success', async () => {
			exchangeRateServiceMock.deleteExchangeRate.mockResolvedValue(true)

			const res = await request(app).delete('/exchange-rates/10')

			expect(exchangeRateServiceMock.deleteExchangeRate).toHaveBeenCalledWith(
				10
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.message).toBe('Exchange rate deleted.')
		})
	})

	describe('GET /exchange-rates/latest', () => {
		it('returns 400 when fromCurrencyId is missing', async () => {
			const res = await request(app).get(
				'/exchange-rates/latest?toCurrencyId=2'
			)

			expect(res.body.statusCode).toBe(400)
			expect(exchangeRateServiceMock.getLatestExchangeRate).not.toHaveBeenCalled()
		})

		it('returns 400 when toCurrencyId is missing', async () => {
			const res = await request(app).get(
				'/exchange-rates/latest?fromCurrencyId=1'
			)

			expect(res.body.statusCode).toBe(400)
			expect(exchangeRateServiceMock.getLatestExchangeRate).not.toHaveBeenCalled()
		})

		it('looks up the latest exchange rate and returns 200 on success', async () => {
			exchangeRateServiceMock.getLatestExchangeRate.mockResolvedValue(
				exchangeRateDTO as never
			)

			const res = await request(app).get(
				'/exchange-rates/latest?fromCurrencyId=1&toCurrencyId=2'
			)

			expect(exchangeRateServiceMock.getLatestExchangeRate).toHaveBeenCalledWith(
				{ fromCurrencyId: 1, toCurrencyId: 2 }
			)
			expect(res.body.statusCode).toBe(200)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			exchangeRateServiceMock.getLatestExchangeRate.mockRejectedValue(
				new AppException(
					'No active exchange rate found for this currency pair',
					404
				)
			)

			const res = await request(app).get(
				'/exchange-rates/latest?fromCurrencyId=1&toCurrencyId=2'
			)

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})
})
