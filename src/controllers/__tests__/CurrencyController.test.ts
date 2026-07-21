import express, { Application } from 'express'
import request from 'supertest'
import { CurrencyController } from '../CurrencyController'
import { ICurrencyService } from '../../interfaces/service/ICurrencyService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createCurrencySchema,
	updateCurrencySchema,
} from '../../validation/currencySchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way currencyRoutes.ts wires the real routes
// (validation middleware -> controller -> asyncHandler -> globalErrorHandler),
// but with a mocked ICurrencyService so no DI container / real DB is involved.
describe('CurrencyController', () => {
	let currencyServiceMock: jest.Mocked<ICurrencyService>
	let app: Application

	const sgd = {
		id: 1,
		code: 'SGD',
		name: 'Singapore Dollar',
		symbol: 'S$',
		isBaseCurrency: true,
		isActive: true,
	}

	beforeEach(() => {
		currencyServiceMock = {
			getAllCurrencies: jest.fn(),
			createCurrency: jest.fn(),
			getCurrencyById: jest.fn(),
			updateCurrency: jest.fn(),
			deleteCurrency: jest.fn(),
		} as unknown as jest.Mocked<ICurrencyService>

		const currencyController = new CurrencyController(currencyServiceMock)

		app = express()
		app.use(express.json())
		app.route('/currencies')
			.get(currencyController.getAllCurrencies)
			.post(
				zodSchemaValidator(createCurrencySchema),
				currencyController.createCurrency
			)
		app.route('/currencies/:id')
			.get(currencyController.getCurrencyById)
			.put(
				zodSchemaValidator(updateCurrencySchema),
				currencyController.updateCurrency
			)
			.delete(currencyController.deleteCurrency)
		app.use(globalErrorHandler)
	})

	describe('GET /currencies', () => {
		it('returns the list of currencies', async () => {
			currencyServiceMock.getAllCurrencies.mockResolvedValue([
				sgd,
			] as never)

			const res = await request(app).get('/currencies')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data).toEqual([sgd])
		})

		it('parses the isActive query param into a boolean filter', async () => {
			currencyServiceMock.getAllCurrencies.mockResolvedValue([
				sgd,
			] as never)

			await request(app).get('/currencies?isActive=true')

			expect(currencyServiceMock.getAllCurrencies).toHaveBeenCalledWith(
				expect.objectContaining({ isActive: true })
			)
		})
	})

	describe('POST /currencies', () => {
		it('returns 422 when code is not a 3-letter string', async () => {
			const res = await request(app)
				.post('/currencies')
				.send({ code: 'SG', name: 'Singapore Dollar', symbol: 'S$' })

			expect(res.body.statusCode).toBe(422)
			expect(currencyServiceMock.createCurrency).not.toHaveBeenCalled()
		})

		it('returns 422 when symbol is missing', async () => {
			const res = await request(app)
				.post('/currencies')
				.send({ code: 'SGD', name: 'Singapore Dollar' })

			expect(res.body.statusCode).toBe(422)
			expect(currencyServiceMock.createCurrency).not.toHaveBeenCalled()
		})

		it('creates the currency and returns 201 on success', async () => {
			currencyServiceMock.createCurrency.mockResolvedValue(sgd as never)

			const res = await request(app).post('/currencies').send({
				code: 'SGD',
				name: 'Singapore Dollar',
				symbol: 'S$',
				isBaseCurrency: true,
			})

			expect(currencyServiceMock.createCurrency).toHaveBeenCalledWith(
				expect.objectContaining({
					code: 'SGD',
					name: 'Singapore Dollar',
					symbol: 'S$',
					isBaseCurrency: true,
				})
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(sgd)
		})

		it('propagates a domain AppException (e.g. duplicate code) through the central error handler', async () => {
			currencyServiceMock.createCurrency.mockRejectedValue(
				new AppException('Currency with this code already exists', 409)
			)

			const res = await request(app)
				.post('/currencies')
				.send({ code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' })

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
			expect(res.body.message).toBe(
				'Currency with this code already exists'
			)
		})
	})

	describe('GET /currencies/:id', () => {
		it('returns the currency when found', async () => {
			currencyServiceMock.getCurrencyById.mockResolvedValue(sgd as never)

			const res = await request(app).get('/currencies/1')

			expect(currencyServiceMock.getCurrencyById).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(sgd)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			currencyServiceMock.getCurrencyById.mockRejectedValue(
				new AppException('Currency not found', 404)
			)

			const res = await request(app).get('/currencies/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /currencies/:id (update)', () => {
		it('returns 422 on an invalid code', async () => {
			const res = await request(app)
				.put('/currencies/1')
				.send({ code: '1' })

			expect(res.body.statusCode).toBe(422)
			expect(currencyServiceMock.updateCurrency).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the currency was not found', async () => {
			currencyServiceMock.updateCurrency.mockResolvedValue(null)

			const res = await request(app)
				.put('/currencies/999')
				.send({ name: 'New Name' })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the currency and returns 200 on success', async () => {
			const updated = { ...sgd, isActive: false }
			currencyServiceMock.updateCurrency.mockResolvedValue(
				updated as never
			)

			const res = await request(app)
				.put('/currencies/1')
				.send({ isActive: false })

			expect(currencyServiceMock.updateCurrency).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ isActive: false })
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(updated)
		})

		it('propagates a domain AppException (e.g. base currency conflict) through the central error handler', async () => {
			currencyServiceMock.updateCurrency.mockRejectedValue(
				new AppException(
					'Currency SGD is already set as the base currency. Unset it before assigning a new base currency.',
					409
				)
			)

			const res = await request(app)
				.put('/currencies/2')
				.send({ isBaseCurrency: true })

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('DELETE /currencies/:id', () => {
		it('returns 404 when the currency does not exist', async () => {
			currencyServiceMock.deleteCurrency.mockResolvedValue(false)

			const res = await request(app).delete('/currencies/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the currency and returns 200 on success', async () => {
			currencyServiceMock.deleteCurrency.mockResolvedValue(true)

			const res = await request(app).delete('/currencies/1')

			expect(currencyServiceMock.deleteCurrency).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
		})

		it('propagates a domain AppException (e.g. cannot delete base currency) through the central error handler', async () => {
			currencyServiceMock.deleteCurrency.mockRejectedValue(
				new AppException(
					'Cannot delete the active base currency. Assign a new base currency first.',
					409
				)
			)

			const res = await request(app).delete('/currencies/1')

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})
})
