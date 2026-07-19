import { Transaction } from 'sequelize'
import AppException from '../../exceptions/AppException'
import { USER_STATUS } from '../../constants'
import { IUserRepository } from '../../interfaces/repository/IUserRepository'
import { IRefreshTokenRepository } from '../../interfaces/repository/IRefreshTokenRepository'
import { ICountryRepository } from '../../interfaces/repository/ICountryRepository'
import { IPasswordService } from '../../interfaces/repository/IPasswordService'
import { IEmailService } from '../../interfaces/service/IEmailService'

// AuthService pulls `sequelize` in from '../models' purely to call `.transaction(...)`.
// Mock the whole models module so unit tests never touch a real DB connection.
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
import AuthService from '../AuthService'

describe('AuthService', () => {
	let userRepository: jest.Mocked<IUserRepository>
	let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>
	let countryRepository: jest.Mocked<ICountryRepository>
	let passwordService: jest.Mocked<IPasswordService>
	let emailService: jest.Mocked<IEmailService>
	let authService: AuthService

	const activeUser = {
		id: 1,
		name: 'John Doe',
		email: 'john@example.com',
		password: 'hashed-password',
		status: USER_STATUS.ACTIVE,
	}

	beforeEach(() => {
		userRepository = {
			findByEmail: jest.fn(),
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
		} as unknown as jest.Mocked<IUserRepository>

		refreshTokenRepository = {
			findByTokenHash: jest.fn(),
			revoke: jest.fn(),
			revokeAllActiveForUser: jest.fn(),
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
		} as unknown as jest.Mocked<IRefreshTokenRepository>

		countryRepository = {
			findByCode: jest.fn(),
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
		} as unknown as jest.Mocked<ICountryRepository>

		passwordService = {
			hashPassword: jest.fn(),
			verifyPassword: jest.fn(),
		}

		emailService = {
			send: jest.fn(),
		}

		authService = new AuthService(
			userRepository,
			refreshTokenRepository,
			countryRepository,
			passwordService,
			emailService
		)
	})

	describe('signIn', () => {
		it('throws 401 when the user does not exist', async () => {
			userRepository.findByEmail.mockResolvedValue(null)

			await expect(
				authService.signIn({ email: 'nobody@example.com', password: 'x' } as never)
			).rejects.toMatchObject({ message: 'Invalid email or password!', statusCode: 401 })
		})

		it('throws 401 when the password does not match', async () => {
			userRepository.findByEmail.mockResolvedValue(activeUser as never)
			passwordService.verifyPassword.mockResolvedValue(false)

			await expect(
				authService.signIn({ email: activeUser.email, password: 'wrong' } as never)
			).rejects.toMatchObject({ statusCode: 401 })
		})

		it('throws 403 when the user is not active', async () => {
			userRepository.findByEmail.mockResolvedValue({
				...activeUser,
				status: USER_STATUS.INACTIVE,
			} as never)
			passwordService.verifyPassword.mockResolvedValue(true)

			await expect(
				authService.signIn({ email: activeUser.email, password: 'x' } as never)
			).rejects.toMatchObject({ statusCode: 403 })
		})

		it('issues an access + refresh token pair on success and persists the refresh token hash', async () => {
			userRepository.findByEmail.mockResolvedValue(activeUser as never)
			passwordService.verifyPassword.mockResolvedValue(true)
			refreshTokenRepository.create.mockResolvedValue({
				id: 10,
				userId: activeUser.id,
			} as never)

			const result = await authService.signIn({
				email: activeUser.email,
				password: 'correct',
			} as never)

			expect(result).toEqual(
				expect.objectContaining({
					user: { name: activeUser.name, email: activeUser.email },
					accessToken: expect.any(String),
					refreshToken: expect.any(String),
					accessTokenExpiresAt: expect.any(Date),
					refreshTokenExpiresAt: expect.any(Date),
				})
			)
			// The raw refresh token must never be the same as what's persisted (only its hash is stored).
			expect(refreshTokenRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: activeUser.id,
					tokenHash: expect.any(String),
				}),
				expect.objectContaining({ transaction: undefined })
			)
			const createCallArg = refreshTokenRepository.create.mock.calls[0][0] as {
				tokenHash: string
			}
			expect(createCallArg.tokenHash).not.toEqual(result!.refreshToken)
		})

		it('throws a 500 if the refresh token could not be persisted', async () => {
			userRepository.findByEmail.mockResolvedValue(activeUser as never)
			passwordService.verifyPassword.mockResolvedValue(true)
			refreshTokenRepository.create.mockResolvedValue(undefined)

			await expect(
				authService.signIn({ email: activeUser.email, password: 'correct' } as never)
			).rejects.toMatchObject({ statusCode: 500 })
		})
	})

	describe('refreshToken', () => {
		it('throws 401 when the token hash is not found', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue(null)

			await expect(authService.refreshToken('unknown-token')).rejects.toMatchObject({
				message: 'Invalid refresh token!',
				statusCode: 401,
			})
		})

		it('revokes every active token for the user and throws 401 on reuse of a revoked token', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue({
				id: 5,
				userId: activeUser.id,
				revokedAt: new Date(),
				expiresAt: new Date(Date.now() + 1000 * 60),
			} as never)

			await expect(authService.refreshToken('stolen-token')).rejects.toMatchObject({
				statusCode: 401,
			})

			expect(refreshTokenRepository.revokeAllActiveForUser).toHaveBeenCalledWith(
				activeUser.id
			)
		})

		it('throws 401 when the token has expired', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue({
				id: 5,
				userId: activeUser.id,
				revokedAt: null,
				expiresAt: new Date(Date.now() - 1000),
			} as never)

			await expect(authService.refreshToken('expired-token')).rejects.toMatchObject({
				message: 'Refresh token has expired!',
				statusCode: 401,
			})
		})

		it('throws 401 when the owning user no longer exists', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue({
				id: 5,
				userId: 999,
				revokedAt: null,
				expiresAt: new Date(Date.now() + 1000 * 60),
			} as never)
			userRepository.findByPk.mockResolvedValue(null)

			await expect(authService.refreshToken('orphaned-token')).rejects.toMatchObject({
				message: 'Invalid refresh token!',
				statusCode: 401,
			})
		})

		it('throws 403 when the owning user is no longer active', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue({
				id: 5,
				userId: activeUser.id,
				revokedAt: null,
				expiresAt: new Date(Date.now() + 1000 * 60),
			} as never)
			userRepository.findByPk.mockResolvedValue({
				...activeUser,
				status: USER_STATUS.INACTIVE,
			} as never)

			await expect(authService.refreshToken('valid-token')).rejects.toMatchObject({
				statusCode: 403,
			})
		})

		it('rotates the token inside a transaction: creates a new pair and revokes the old one', async () => {
			const existingToken = {
				id: 5,
				userId: activeUser.id,
				revokedAt: null,
				expiresAt: new Date(Date.now() + 1000 * 60),
			}
			refreshTokenRepository.findByTokenHash.mockResolvedValue(existingToken as never)
			userRepository.findByPk.mockResolvedValue(activeUser as never)
			refreshTokenRepository.create.mockResolvedValue({
				id: 11,
				userId: activeUser.id,
			} as never)

			const result = await authService.refreshToken('valid-token')

			expect(transactionMock).toHaveBeenCalledTimes(1)
			expect(refreshTokenRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ userId: activeUser.id }),
				expect.objectContaining({ transaction: {} })
			)
			expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(
				existingToken.id,
				11,
				{}
			)
			expect(result).toEqual(
				expect.objectContaining({
					accessToken: expect.any(String),
					refreshToken: expect.any(String),
					accessTokenExpiresAt: expect.any(Date),
					refreshTokenExpiresAt: expect.any(Date),
				})
			)
		})
	})

	describe('logout', () => {
		it('revokes the token when it exists and is still active', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue({
				id: 5,
				userId: activeUser.id,
				revokedAt: null,
				expiresAt: new Date(Date.now() + 1000 * 60),
			} as never)

			await authService.logout('valid-token')

			expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(5, null)
		})

		it('is a no-op (still resolves) when the token is unknown', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue(null)

			await expect(authService.logout('unknown-token')).resolves.toBeUndefined()

			expect(refreshTokenRepository.revoke).not.toHaveBeenCalled()
		})

		it('is a no-op (still resolves) when the token was already revoked', async () => {
			refreshTokenRepository.findByTokenHash.mockResolvedValue({
				id: 5,
				userId: activeUser.id,
				revokedAt: new Date(),
				expiresAt: new Date(Date.now() + 1000 * 60),
			} as never)

			await expect(authService.logout('already-used-token')).resolves.toBeUndefined()

			expect(refreshTokenRepository.revoke).not.toHaveBeenCalled()
		})
	})

	describe('updateProfile', () => {
		const profileUpdate = {
			firstName: 'Jane',
			lastName: 'Smith',
			email: 'jane.smith@example.com',
			username: 'janesmith',
			countryId: 7,
		}

		const buildUserInstance = (overrides: Record<string, unknown> = {}) => {
			const instance = {
				id: 1,
				email: activeUser.email,
				username: 'oldusername',
				...overrides,
			}
			return {
				...instance,
				update: jest.fn(async (data: Record<string, unknown>) => {
					Object.assign(instance, data)
					return instance
				}),
			}
		}

		it('throws 404 when the user does not exist', async () => {
			userRepository.findByPk.mockResolvedValue(null)

			await expect(
				authService.updateProfile(999, profileUpdate)
			).rejects.toMatchObject({ message: 'User not found!', statusCode: 404 })
		})

		it('throws 409 when the email is already used by another user', async () => {
			userRepository.findByPk.mockResolvedValue(buildUserInstance() as never)
			userRepository.findOne.mockResolvedValue({
				id: 2,
				email: profileUpdate.email,
				username: 'someoneelse',
			} as never)

			await expect(
				authService.updateProfile(1, profileUpdate)
			).rejects.toMatchObject({
				message: 'Email already in use!',
				statusCode: 409,
			})
		})

		it('throws 409 when the username is already used by another user', async () => {
			userRepository.findByPk.mockResolvedValue(buildUserInstance() as never)
			userRepository.findOne.mockResolvedValue({
				id: 2,
				email: 'someoneelse@example.com',
				username: profileUpdate.username,
			} as never)

			await expect(
				authService.updateProfile(1, profileUpdate)
			).rejects.toMatchObject({
				message: 'Username already in use!',
				statusCode: 409,
			})
		})

		it('throws 400 when countryId does not reference an existing country', async () => {
			userRepository.findByPk.mockResolvedValue(buildUserInstance() as never)
			userRepository.findOne.mockResolvedValue(null)
			countryRepository.findByPk.mockResolvedValue(null)

			await expect(
				authService.updateProfile(1, profileUpdate)
			).rejects.toMatchObject({ message: 'Country not found!', statusCode: 400 })
		})

		it('updates the profile, derives fullName, and returns the nested country', async () => {
			const userInstance = buildUserInstance()
			userRepository.findByPk.mockResolvedValue(userInstance as never)
			userRepository.findOne.mockResolvedValue(null)
			countryRepository.findByPk.mockResolvedValue({
				id: 7,
				code: 'SG',
				name: 'Singapore',
			} as never)

			const result = await authService.updateProfile(1, profileUpdate)

			expect(userInstance.update).toHaveBeenCalledWith(
				expect.objectContaining({
					firstName: 'Jane',
					lastName: 'Smith',
					email: profileUpdate.email,
					username: profileUpdate.username,
					countryId: 7,
					name: 'Jane Smith',
				}),
				expect.objectContaining({ transaction: {} })
			)
			expect(result).toEqual({
				id: 1,
				fullName: 'Jane Smith',
				email: profileUpdate.email,
				username: profileUpdate.username,
				country: { id: 7, code: 'SG', name: 'Singapore' },
			})
		})

		it('clears the country when countryId is omitted', async () => {
			const userInstance = buildUserInstance()
			userRepository.findByPk.mockResolvedValue(userInstance as never)
			userRepository.findOne.mockResolvedValue(null)

			const { countryId: _countryId, ...withoutCountry } = profileUpdate
			const result = await authService.updateProfile(1, withoutCountry)

			expect(countryRepository.findByPk).not.toHaveBeenCalled()
			expect(userInstance.update).toHaveBeenCalledWith(
				expect.objectContaining({ countryId: null }),
				expect.objectContaining({ transaction: {} })
			)
			expect(result.country).toBeNull()
		})
	})
})
