import express, { Application } from 'express'
import request from 'supertest'
import AuthController from '../AuthController'
import { IAuthService } from '../../interfaces/service/IAuthService'
import zodSchemaValidator from '../../validation/zodValidator'
import { refreshTokenSchema } from '../../validation/authSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests against a minimal app wired the same way authRoutes.ts wires the real
// /logout route (validation middleware -> controller -> asyncHandler -> globalErrorHandler),
// but with a mocked IAuthService so no DI container / real DB is involved.
describe('POST /logout', () => {
	let authServiceMock: jest.Mocked<IAuthService>
	let app: Application

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
		} as unknown as jest.Mocked<IAuthService>

		const authController = new AuthController(authServiceMock)

		app = express()
		app.use(express.json())
		app.post(
			'/logout',
			zodSchemaValidator(refreshTokenSchema),
			authController.logOut
		)
		app.use(globalErrorHandler)
	})

	it('returns 422 (validation error) when refreshToken is missing', async () => {
		const res = await request(app).post('/logout').send({})

		expect(res.body.statusCode).toBe(422)
		expect(res.body.isSuccess).toBe(false)
		expect(authServiceMock.logout).not.toHaveBeenCalled()
	})

	it('returns 422 (validation error) when refreshToken is an empty string', async () => {
		const res = await request(app)
			.post('/logout')
			.send({ refreshToken: '' })

		expect(res.body.statusCode).toBe(422)
		expect(authServiceMock.logout).not.toHaveBeenCalled()
	})

	it('revokes the token and returns a success message (happy path)', async () => {
		authServiceMock.logout.mockResolvedValue(undefined)

		const res = await request(app)
			.post('/logout')
			.send({ refreshToken: 'valid-raw-token' })

		expect(authServiceMock.logout).toHaveBeenCalledWith('valid-raw-token')
		expect(res.body.statusCode).toBe(200)
		expect(res.body.isSuccess).toBe(true)
		expect(res.body.message).toBe('Logged out successfully.')
	})

	it('still returns 200 for an unknown/already-revoked token (idempotent, no existence leak)', async () => {
		authServiceMock.logout.mockResolvedValue(undefined)

		const res = await request(app)
			.post('/logout')
			.send({ refreshToken: 'unknown-or-stale-token' })

		expect(res.body.statusCode).toBe(200)
		expect(res.body.isSuccess).toBe(true)
	})

	it('propagates a domain AppException from the service through the central error handler', async () => {
		authServiceMock.logout.mockRejectedValue(
			new AppException('Something went wrong!', 500)
		)

		const res = await request(app)
			.post('/logout')
			.send({ refreshToken: 'valid-raw-token' })

		expect(res.body.statusCode).toBe(500)
		expect(res.body.isSuccess).toBe(false)
		expect(res.body.message).toBe('Something went wrong!')
	})

	it('maps an unexpected non-AppException error to a 500 via the central error handler', async () => {
		authServiceMock.logout.mockRejectedValue(new Error('boom'))

		const res = await request(app)
			.post('/logout')
			.send({ refreshToken: 'valid-raw-token' })

		expect(res.body.statusCode).toBe(500)
		expect(res.body.isSuccess).toBe(false)
	})
})
