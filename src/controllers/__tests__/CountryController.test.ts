import express, { Application } from 'express'
import request from 'supertest'
import { CountryController } from '../CountryController'
import { ICountryService } from '../../interfaces/service/ICountryService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createCountrySchema,
	updateCountrySchema,
} from '../../validation/countrySchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way countryRoutes.ts wires the real routes
// (validation middleware -> controller -> asyncHandler -> globalErrorHandler),
// but with a mocked ICountryService so no DI container / real DB is involved.
describe('CountryController', () => {
	let countryServiceMock: jest.Mocked<ICountryService>
	let app: Application

	const singapore = { id: 1, code: 'SG', name: 'Singapore' }

	beforeEach(() => {
		countryServiceMock = {
			getAllCountries: jest.fn(),
			createCountry: jest.fn(),
			getCountryById: jest.fn(),
			updateCountry: jest.fn(),
			deleteCountry: jest.fn(),
		} as unknown as jest.Mocked<ICountryService>

		const countryController = new CountryController(countryServiceMock)

		app = express()
		app.use(express.json())
		app.route('/countries')
			.get(countryController.getAllCountries)
			.post(
				zodSchemaValidator(createCountrySchema),
				countryController.createCountry
			)
		app.route('/countries/:id')
			.get(countryController.getCountryById)
			.post(
				zodSchemaValidator(updateCountrySchema),
				countryController.updateCountry
			)
			.delete(countryController.deleteCountry)
		app.use(globalErrorHandler)
	})

	describe('GET /countries', () => {
		it('returns the list of countries', async () => {
			countryServiceMock.getAllCountries.mockResolvedValue([
				singapore,
			] as never)

			const res = await request(app).get('/countries')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data).toEqual([singapore])
		})
	})

	describe('POST /countries', () => {
		it('returns 422 when code is not a 2-letter string', async () => {
			const res = await request(app)
				.post('/countries')
				.send({ code: 'SGP', name: 'Singapore' })

			expect(res.body.statusCode).toBe(422)
			expect(countryServiceMock.createCountry).not.toHaveBeenCalled()
		})

		it('returns 422 when name is missing', async () => {
			const res = await request(app)
				.post('/countries')
				.send({ code: 'SG' })

			expect(res.body.statusCode).toBe(422)
			expect(countryServiceMock.createCountry).not.toHaveBeenCalled()
		})

		it('creates the country and returns 201 on success', async () => {
			countryServiceMock.createCountry.mockResolvedValue(
				singapore as never
			)

			const res = await request(app)
				.post('/countries')
				.send({ code: 'SG', name: 'Singapore' })

			// Note: zodSchemaValidator annotates req.body with a `.data` field
			// alongside the original payload rather than replacing it (see
			// src/validation/zodValidator.ts) — controllers pass req.body through
			// as-is, matching the rest of the codebase (e.g. AuthController).
			expect(countryServiceMock.createCountry).toHaveBeenCalledWith(
				expect.objectContaining({ code: 'SG', name: 'Singapore' })
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(singapore)
		})

		it('propagates a domain AppException (e.g. duplicate code) through the central error handler', async () => {
			countryServiceMock.createCountry.mockRejectedValue(
				new AppException('Country with this code already exists', 409)
			)

			const res = await request(app)
				.post('/countries')
				.send({ code: 'SG', name: 'Singapore' })

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
			expect(res.body.message).toBe(
				'Country with this code already exists'
			)
		})
	})

	describe('GET /countries/:id', () => {
		it('returns the country when found', async () => {
			countryServiceMock.getCountryById.mockResolvedValue(
				singapore as never
			)

			const res = await request(app).get('/countries/1')

			expect(countryServiceMock.getCountryById).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(singapore)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			countryServiceMock.getCountryById.mockRejectedValue(
				new AppException('Country not found', 404)
			)

			const res = await request(app).get('/countries/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('POST /countries/:id (update)', () => {
		it('returns 422 on an invalid code', async () => {
			const res = await request(app)
				.post('/countries/1')
				.send({ code: '1' })

			expect(res.body.statusCode).toBe(422)
			expect(countryServiceMock.updateCountry).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the country was not found', async () => {
			countryServiceMock.updateCountry.mockResolvedValue(null)

			const res = await request(app)
				.post('/countries/999')
				.send({ name: 'New Name' })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the country and returns 200 on success', async () => {
			const updated = { ...singapore, name: 'Singapore Republic' }
			countryServiceMock.updateCountry.mockResolvedValue(updated as never)

			const res = await request(app)
				.post('/countries/1')
				.send({ name: 'Singapore Republic' })

			expect(countryServiceMock.updateCountry).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ name: 'Singapore Republic' })
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(updated)
		})
	})

	describe('DELETE /countries/:id', () => {
		it('returns 404 when the country does not exist', async () => {
			countryServiceMock.deleteCountry.mockResolvedValue(false)

			const res = await request(app).delete('/countries/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the country and returns 200 on success', async () => {
			countryServiceMock.deleteCountry.mockResolvedValue(true)

			const res = await request(app).delete('/countries/1')

			expect(countryServiceMock.deleteCountry).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
		})
	})
})
