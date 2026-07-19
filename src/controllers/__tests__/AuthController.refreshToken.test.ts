import express, { Application } from 'express'
import request from 'supertest'
import AuthController from '../AuthController'
import { IAuthService } from '../../interfaces/service/IAuthService'
import zodSchemaValidator from '../../validation/zodValidator'
import { refreshTokenSchema } from '../../validation/authSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// These are HTTP-level tests against a minimal app wired the same way authRoutes.ts wires
// the real route (validation middleware -> controller -> asyncHandler -> globalErrorHandler),
// but with a mocked IAuthService so no DI container / real DB is involved.
describe('POST /refresh-token', () => {
	let authServiceMock: jest.Mocked<IAuthService>
	let app: Application

	beforeEach(() => {
		authServiceMock = {
			verifyToken: jest.fn(),
			signIn: jest.fn(),
			refreshToken: jest.fn(),
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
			'/refresh-token',
			zodSchemaValidator(refreshTokenSchema),
			authController.refreshToken
		)
		app.use(globalErrorHandler)
	})

	it('returns 422 (validation error) when refreshToken is missing', async () => {
		const res = await request(app).post('/refresh-token').send({})

		expect(res.body.statusCode).toBe(422)
		expect(res.body.isSuccess).toBe(false)
		expect(authServiceMock.refreshToken).not.toHaveBeenCalled()
	})

	it('returns 422 (validation error) when refreshToken is an empty string', async () => {
		const res = await request(app)
			.post('/refresh-token')
			.send({ refreshToken: '' })

		expect(res.body.statusCode).toBe(422)
		expect(authServiceMock.refreshToken).not.toHaveBeenCalled()
	})

	it('returns the new token pair on success (happy path)', async () => {
		const responseData = {
			accessToken: 'new-access-token',
			refreshToken: 'new-refresh-token',
			accessTokenExpiresAt: new Date(),
			refreshTokenExpiresAt: new Date(),
		}
		authServiceMock.refreshToken.mockResolvedValue(responseData)

		const res = await request(app)
			.post('/refresh-token')
			.send({ refreshToken: 'valid-raw-token' })

		expect(authServiceMock.refreshToken).toHaveBeenCalledWith(
			'valid-raw-token'
		)
		expect(res.body.statusCode).toBe(200)
		expect(res.body.isSuccess).toBe(true)
		expect(res.body.data.accessToken).toBe('new-access-token')
		expect(res.body.data.refreshToken).toBe('new-refresh-token')
	})

	it('propagates a domain AppException from the service through the central error handler', async () => {
		authServiceMock.refreshToken.mockRejectedValue(
			new AppException('Invalid refresh token!', 401)
		)

		const res = await request(app)
			.post('/refresh-token')
			.send({ refreshToken: 'bad-token' })

		expect(res.body.statusCode).toBe(401)
		expect(res.body.isSuccess).toBe(false)
		expect(res.body.message).toBe('Invalid refresh token!')
	})

	it('maps an unexpected non-AppException error to a 500 via the central error handler', async () => {
		authServiceMock.refreshToken.mockRejectedValue(new Error('boom'))

		const res = await request(app)
			.post('/refresh-token')
			.send({ refreshToken: 'bad-token' })

		expect(res.body.statusCode).toBe(500)
		expect(res.body.isSuccess).toBe(false)
	})
})
