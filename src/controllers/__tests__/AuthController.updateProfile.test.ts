import express, { Application, NextFunction, Request, Response } from 'express'
import request from 'supertest'
import AuthController from '../AuthController'
import { IAuthService } from '../../interfaces/service/IAuthService'
import zodSchemaValidator from '../../validation/zodValidator'
import { updateProfileSchema } from '../../validation/authSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests against a minimal app wired the same way authRoutes.ts wires the real
// PUT /update-profile route (auth -> validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked IAuthService (no DI container/real DB) and a stub
// auth middleware standing in for `protect` (real JWT verification is covered separately).
describe('PUT /update-profile', () => {
	let authServiceMock: jest.Mocked<IAuthService>
	let app: Application

	const authenticatedUserId = 1

	beforeEach(() => {
		authServiceMock = {
			verifyToken: jest.fn(),
			signIn: jest.fn(),
			refreshToken: jest.fn(),
			logout: jest.fn(),
			forgotPassword: jest.fn(),
			resetPassword: jest.fn(),
			signUp: jest.fn(),
			findUserById: jest.fn(),
			findUserWithRelations: jest.fn(),
			updateProfile: jest.fn(),
		} as unknown as jest.Mocked<IAuthService>

		const authController = new AuthController(authServiceMock)

		app = express()
		app.use(express.json())
		app.put(
			'/update-profile',
			(req: Request, _res: Response, next: NextFunction) => {
				req.user = {
					id: authenticatedUserId,
					email: 'john@example.com',
					name: 'John Doe',
					roles: ['User'],
					permissions: [],
				}
				next()
			},
			zodSchemaValidator(updateProfileSchema),
			authController.updateProfile
		)
		app.use(globalErrorHandler)
	})

	const validPayload = {
		firstName: 'Jane',
		lastName: 'Smith',
		email: 'jane.smith@example.com',
		username: 'janesmith',
		countryId: 7,
	}

	it('returns 422 (validation error) when a required field is missing', async () => {
		const { firstName: _firstName, ...withoutFirstName } = validPayload

		const res = await request(app)
			.put('/update-profile')
			.send(withoutFirstName)

		expect(res.body.statusCode).toBe(422)
		expect(res.body.isSuccess).toBe(false)
		expect(authServiceMock.updateProfile).not.toHaveBeenCalled()
	})

	it('returns 422 (validation error) when email is malformed', async () => {
		const res = await request(app)
			.put('/update-profile')
			.send({ ...validPayload, email: 'not-an-email' })

		expect(res.body.statusCode).toBe(422)
		expect(authServiceMock.updateProfile).not.toHaveBeenCalled()
	})

	it('returns 422 (validation error) when countryId is not a positive integer', async () => {
		const res = await request(app)
			.put('/update-profile')
			.send({ ...validPayload, countryId: -1 })

		expect(res.body.statusCode).toBe(422)
		expect(authServiceMock.updateProfile).not.toHaveBeenCalled()
	})

	it('updates the profile for the authenticated user (happy path)', async () => {
		const responseData = {
			id: authenticatedUserId,
			fullName: 'Jane Smith',
			email: validPayload.email,
			username: validPayload.username,
			country: { id: 7, code: 'SG', name: 'Singapore' },
		}
		authServiceMock.updateProfile.mockResolvedValue(responseData)

		const res = await request(app).put('/update-profile').send(validPayload)

		// zodSchemaValidator mutates `req.body` (adds a parsed `.data` key) rather than
		// replacing it, and the controller forwards the raw `req.body` on — matching every
		// other controller in this codebase (see AuthController.signIn/UserController etc.),
		// so assert on the fields the service actually needs rather than strict equality.
		expect(authServiceMock.updateProfile).toHaveBeenCalledWith(
			authenticatedUserId,
			expect.objectContaining(validPayload)
		)
		expect(res.body.statusCode).toBe(200)
		expect(res.body.isSuccess).toBe(true)
		expect(res.body.data).toEqual(responseData)
	})

	it('allows countryId to be omitted to clear the country', async () => {
		const { countryId: _countryId, ...withoutCountry } = validPayload
		const responseData = {
			id: authenticatedUserId,
			fullName: 'Jane Smith',
			email: validPayload.email,
			username: validPayload.username,
			country: null,
		}
		authServiceMock.updateProfile.mockResolvedValue(responseData)

		const res = await request(app)
			.put('/update-profile')
			.send(withoutCountry)

		expect(authServiceMock.updateProfile).toHaveBeenCalledWith(
			authenticatedUserId,
			expect.objectContaining(withoutCountry)
		)
		expect(res.body.statusCode).toBe(200)
		expect(res.body.data.country).toBeNull()
	})

	it('propagates a domain AppException (duplicate email) through the central error handler', async () => {
		authServiceMock.updateProfile.mockRejectedValue(
			new AppException('Email already in use!', 409)
		)

		const res = await request(app).put('/update-profile').send(validPayload)

		expect(res.body.statusCode).toBe(409)
		expect(res.body.isSuccess).toBe(false)
		expect(res.body.message).toBe('Email already in use!')
	})

	it('maps an unexpected non-AppException error to a 500 via the central error handler', async () => {
		authServiceMock.updateProfile.mockRejectedValue(new Error('boom'))

		const res = await request(app).put('/update-profile').send(validPayload)

		expect(res.body.statusCode).toBe(500)
		expect(res.body.isSuccess).toBe(false)
	})
})
