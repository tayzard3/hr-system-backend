import express, { Application, NextFunction, Request, Response } from 'express'
import request from 'supertest'
import AuthController from '../AuthController'
import { IAuthService } from '../../interfaces/service/IAuthService'
import zodSchemaValidator from '../../validation/zodValidator'
import { changePasswordSchema } from '../../validation/authSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests against a minimal app wired the same way authRoutes.ts wires the real
// POST /change-password route (auth -> validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked IAuthService (no DI container/real DB) and a stub
// auth middleware standing in for `protect` (real JWT verification is covered separately).
describe('POST /change-password', () => {
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
			changePassword: jest.fn(),
		} as unknown as jest.Mocked<IAuthService>

		const authController = new AuthController(authServiceMock)

		app = express()
		app.use(express.json())
		app.post(
			'/change-password',
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
			zodSchemaValidator(changePasswordSchema),
			authController.changePassword
		)
		app.use(globalErrorHandler)
	})

	const validPayload = {
		currentPassword: 'OldPass1!',
		newPassword: 'NewPass2!',
		confirmNewPassword: 'NewPass2!',
	}

	it('returns 422 (validation error) when currentPassword is missing', async () => {
		const { currentPassword: _currentPassword, ...withoutCurrent } =
			validPayload

		const res = await request(app)
			.post('/change-password')
			.send(withoutCurrent)

		expect(res.body.statusCode).toBe(422)
		expect(res.body.isSuccess).toBe(false)
		expect(authServiceMock.changePassword).not.toHaveBeenCalled()
	})

	it('returns 422 (validation error) when newPassword fails the strength rule', async () => {
		const res = await request(app)
			.post('/change-password')
			.send({ ...validPayload, newPassword: 'short' })

		expect(res.body.statusCode).toBe(422)
		expect(authServiceMock.changePassword).not.toHaveBeenCalled()
	})

	it('changes the password for the authenticated user (happy path)', async () => {
		authServiceMock.changePassword.mockResolvedValue(undefined)

		const res = await request(app)
			.post('/change-password')
			.send(validPayload)

		// zodSchemaValidator mutates `req.body` (adds a parsed `.data` key) rather than
		// replacing it, and the controller forwards the raw `req.body` fields on — matching
		// every other controller in this codebase (see AuthController.updateProfile etc.).
		expect(authServiceMock.changePassword).toHaveBeenCalledWith(
			authenticatedUserId,
			validPayload
		)
		expect(res.body.statusCode).toBe(200)
		expect(res.body.isSuccess).toBe(true)
		expect(res.body.message).toBe('Password changed successfully.')
	})

	it('propagates a domain AppException (password mismatch) through the central error handler', async () => {
		authServiceMock.changePassword.mockRejectedValue(
			new AppException(
				'New password and confirm password do not match!',
				400
			)
		)

		const res = await request(app)
			.post('/change-password')
			.send(validPayload)

		expect(res.body.statusCode).toBe(400)
		expect(res.body.isSuccess).toBe(false)
		expect(res.body.message).toBe(
			'New password and confirm password do not match!'
		)
	})

	it('propagates a domain AppException (wrong current password) through the central error handler', async () => {
		authServiceMock.changePassword.mockRejectedValue(
			new AppException('Current password is incorrect!', 401)
		)

		const res = await request(app)
			.post('/change-password')
			.send(validPayload)

		expect(res.body.statusCode).toBe(401)
		expect(res.body.isSuccess).toBe(false)
		expect(res.body.message).toBe('Current password is incorrect!')
	})

	it('maps an unexpected non-AppException error to a 500 via the central error handler', async () => {
		authServiceMock.changePassword.mockRejectedValue(new Error('boom'))

		const res = await request(app)
			.post('/change-password')
			.send(validPayload)

		expect(res.body.statusCode).toBe(500)
		expect(res.body.isSuccess).toBe(false)
	})
})
