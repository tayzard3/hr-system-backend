import express, { Application } from 'express'
import request from 'supertest'
import { RateCardController } from '../RateCardController'
import { IRateCardService } from '../../interfaces/service/IRateCardService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createRateCardSchema,
	updateRateCardSchema,
} from '../../validation/rateCardSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way rateCardRoutes.ts wires the real
// routes (validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked IRateCardService so no DI
// container / real DB is involved (same convention as
// CurrencyController.test.ts).
describe('RateCardController', () => {
	let rateCardServiceMock: jest.Mocked<IRateCardService>
	let app: Application

	const rateCardDTO = {
		id: 10,
		country: { id: 1, code: 'SG', name: 'Singapore' },
		resourceRoleType: { id: 2, name: 'Senior Developer' },
		currency: { id: 3, code: 'SGD', symbol: 'S$' },
		hourlyRate: 120,
		effectiveDate: '2026-01-01',
		isActive: true,
	}

	beforeEach(() => {
		rateCardServiceMock = {
			getAllRateCards: jest.fn(),
			getRateCardById: jest.fn(),
			createRateCard: jest.fn(),
			updateRateCard: jest.fn(),
			deleteRateCard: jest.fn(),
			lookupRateCard: jest.fn(),
		} as unknown as jest.Mocked<IRateCardService>

		const rateCardController = new RateCardController(rateCardServiceMock)

		app = express()
		app.use(express.json())
		app.route('/rate-cards/lookup').get(rateCardController.lookupRateCard)
		app
			.route('/rate-cards')
			.get(rateCardController.getAllRateCards)
			.post(
				zodSchemaValidator(createRateCardSchema),
				rateCardController.createRateCard
			)
		app
			.route('/rate-cards/:id')
			.get(rateCardController.getRateCardById)
			.put(
				zodSchemaValidator(updateRateCardSchema),
				rateCardController.updateRateCard
			)
			.delete(rateCardController.deleteRateCard)
		app.use(globalErrorHandler)
	})

	describe('GET /rate-cards', () => {
		it('returns the paginated list of rate cards', async () => {
			rateCardServiceMock.getAllRateCards.mockResolvedValue({
				data: [rateCardDTO],
				total: 1,
			} as never)

			const res = await request(app).get('/rate-cards')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data.data).toEqual([rateCardDTO])
		})

		it('parses filter query params through to the service', async () => {
			rateCardServiceMock.getAllRateCards.mockResolvedValue({
				data: [],
				total: 0,
			} as never)

			await request(app).get(
				'/rate-cards?countryId=1&resourceRoleTypeId=2&currencyId=3&isActive=true&effectiveDate=2026-06-01'
			)

			expect(rateCardServiceMock.getAllRateCards).toHaveBeenCalledWith(
				expect.objectContaining({
					countryId: 1,
					resourceRoleTypeId: 2,
					currencyId: 3,
					isActive: true,
					effectiveDate: '2026-06-01',
				})
			)
		})
	})

	describe('POST /rate-cards', () => {
		const validBody = {
			countryId: 1,
			resourceRoleTypeId: 2,
			currencyId: 3,
			hourlyRate: 120,
			effectiveDate: '2026-01-01',
		}

		it('returns 422 when hourlyRate is not positive', async () => {
			const res = await request(app)
				.post('/rate-cards')
				.send({ ...validBody, hourlyRate: 0 })

			expect(res.body.statusCode).toBe(422)
			expect(rateCardServiceMock.createRateCard).not.toHaveBeenCalled()
		})

		it('returns 422 when effectiveDate is not YYYY-MM-DD', async () => {
			const res = await request(app)
				.post('/rate-cards')
				.send({ ...validBody, effectiveDate: '01-01-2026' })

			expect(res.body.statusCode).toBe(422)
			expect(rateCardServiceMock.createRateCard).not.toHaveBeenCalled()
		})

		it('creates the rate card and returns 201 on success', async () => {
			rateCardServiceMock.createRateCard.mockResolvedValue(
				rateCardDTO as never
			)

			const res = await request(app).post('/rate-cards').send(validBody)

			expect(rateCardServiceMock.createRateCard).toHaveBeenCalledWith(
				expect.objectContaining(validBody)
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(rateCardDTO)
		})

		it('propagates a domain AppException (e.g. active rate card conflict) through the central error handler', async () => {
			rateCardServiceMock.createRateCard.mockRejectedValue(
				new AppException(
					'An active rate card already exists for this country, resource role type, and effective date',
					409
				)
			)

			const res = await request(app).post('/rate-cards').send(validBody)

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('GET /rate-cards/:id', () => {
		it('returns the rate card when found', async () => {
			rateCardServiceMock.getRateCardById.mockResolvedValue(
				rateCardDTO as never
			)

			const res = await request(app).get('/rate-cards/10')

			expect(rateCardServiceMock.getRateCardById).toHaveBeenCalledWith(10)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(rateCardDTO)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			rateCardServiceMock.getRateCardById.mockRejectedValue(
				new AppException('Rate card not found', 404)
			)

			const res = await request(app).get('/rate-cards/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /rate-cards/:id (update)', () => {
		it('returns 422 when the body is empty', async () => {
			const res = await request(app).put('/rate-cards/10').send({})

			expect(res.body.statusCode).toBe(422)
			expect(rateCardServiceMock.updateRateCard).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the rate card was not found', async () => {
			rateCardServiceMock.updateRateCard.mockResolvedValue(null)

			const res = await request(app)
				.put('/rate-cards/999')
				.send({ hourlyRate: 130 })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the rate card and returns 200 on success', async () => {
			const updated = { ...rateCardDTO, hourlyRate: 130 }
			rateCardServiceMock.updateRateCard.mockResolvedValue(updated as never)

			const res = await request(app)
				.put('/rate-cards/10')
				.send({ hourlyRate: 130 })

			expect(rateCardServiceMock.updateRateCard).toHaveBeenCalledWith(
				10,
				expect.objectContaining({ hourlyRate: 130 })
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(updated)
		})
	})

	describe('DELETE /rate-cards/:id', () => {
		it('returns 404 when the rate card does not exist', async () => {
			rateCardServiceMock.deleteRateCard.mockResolvedValue(false)

			const res = await request(app).delete('/rate-cards/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the rate card and returns 200 on success', async () => {
			rateCardServiceMock.deleteRateCard.mockResolvedValue(true)

			const res = await request(app).delete('/rate-cards/10')

			expect(rateCardServiceMock.deleteRateCard).toHaveBeenCalledWith(10)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
		})
	})

	describe('GET /rate-cards/lookup', () => {
		it('returns 400 when countryId is missing', async () => {
			const res = await request(app).get(
				'/rate-cards/lookup?resourceRoleTypeId=2'
			)

			expect(res.body.statusCode).toBe(400)
			expect(rateCardServiceMock.lookupRateCard).not.toHaveBeenCalled()
		})

		it('returns 400 when asOfDate is not YYYY-MM-DD', async () => {
			const res = await request(app).get(
				'/rate-cards/lookup?countryId=1&resourceRoleTypeId=2&asOfDate=01-01-2026'
			)

			expect(res.body.statusCode).toBe(400)
			expect(rateCardServiceMock.lookupRateCard).not.toHaveBeenCalled()
		})

		it('looks up the effective rate card and returns 200 on success', async () => {
			rateCardServiceMock.lookupRateCard.mockResolvedValue(
				rateCardDTO as never
			)

			const res = await request(app).get(
				'/rate-cards/lookup?countryId=1&resourceRoleTypeId=2&asOfDate=2026-06-01'
			)

			expect(rateCardServiceMock.lookupRateCard).toHaveBeenCalledWith({
				countryId: 1,
				resourceRoleTypeId: 2,
				asOfDate: '2026-06-01',
			})
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(rateCardDTO)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			rateCardServiceMock.lookupRateCard.mockRejectedValue(
				new AppException(
					'No effective rate card found for this country and resource role type',
					404
				)
			)

			const res = await request(app).get(
				'/rate-cards/lookup?countryId=1&resourceRoleTypeId=2'
			)

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})
})
