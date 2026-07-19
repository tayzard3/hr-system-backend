import { injectable, inject } from 'inversify'
import { InferAttributes, Op, QueryTypes, Transaction } from 'sequelize'
import crypto from 'crypto'
import AppException from '../exceptions/AppException'
import { sequelize } from '../models'
import { User } from '../models/User'
import { RefreshToken } from '../models/RefreshToken'
import appConfig from '../utils/config'
import jwt from 'jsonwebtoken'
import { IUserRepository } from '../interfaces/repository/IUserRepository'
import { IRefreshTokenRepository } from '../interfaces/repository/IRefreshTokenRepository'
import { ICountryRepository } from '../interfaces/repository/ICountryRepository'
import { TYPES } from '../containers/inversifyTypes'
import { IPasswordService } from '../interfaces/repository/IPasswordService'
import { IAuthService } from '../interfaces/service/IAuthService'
import { USER_STATUS } from '../constants'
import { IEmailService } from '../interfaces/service/IEmailService'
import { SendGridEmailOptions } from '../utils/Email'
import { UserWithRelations } from '../types/userTypes'
import {
	refreshTokenResponseType,
	UpdateProfileDTO,
	UpdateProfileResponseType,
} from '../types/authServiceTypes'

interface IssuedTokenPair {
	accessToken: string
	accessTokenExpiresAt: Date
	refreshToken: string
	refreshTokenExpiresAt: Date
	refreshTokenRecord: RefreshToken
}

@injectable()
class AuthService implements IAuthService {
	constructor(
		@inject(TYPES.IUserRepository)
		private userRepository: IUserRepository,
		@inject(TYPES.IRefreshTokenRepository)
		private refreshTokenRepository: IRefreshTokenRepository,
		@inject(TYPES.ICountryRepository)
		private countryRepository: ICountryRepository,
		@inject(TYPES.IPasswordService)
		private passwordService: IPasswordService,
		@inject(TYPES.IEmailService) private emailService: IEmailService
	) {}

	/** SHA-256 digest used to look up/store refresh tokens without persisting the raw secret. */
	private hashRefreshToken(rawToken: string): string {
		return crypto.createHash('sha256').update(rawToken).digest('hex')
	}

	private assertActiveUser(status: string): void {
		if (status !== USER_STATUS.ACTIVE) {
			throw new AppException(
				'Account not yet active. Please contact your support!',
				403
			)
		}
	}

	/**
	 * Issues a new access token (JWT) and a new opaque refresh token (persisted as a hash)
	 * for the given user. Accepts an optional transaction so callers rotating an existing
	 * refresh token can wrap the create + revoke in a single atomic write.
	 */
	private async issueTokenPair(
		userId: number,
		transaction?: Transaction
	): Promise<IssuedTokenPair> {
		const accessTokenExpiresInSeconds =
			appConfig.JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS
		const accessToken = jwt.sign({ userId }, appConfig.JWT_SECRET, {
			expiresIn: accessTokenExpiresInSeconds,
		})
		const accessTokenExpiresAt = new Date(
			Date.now() + accessTokenExpiresInSeconds * 1000
		)

		const rawRefreshToken = crypto.randomBytes(64).toString('hex')
		const refreshTokenExpiresInSeconds =
			appConfig.JWT_REFRESH_TOKEN_EXPIRES_IN_SECONDS
		const refreshTokenExpiresAt = new Date(
			Date.now() + refreshTokenExpiresInSeconds * 1000
		)

		const refreshTokenRecord = await this.refreshTokenRepository.create(
			{
				userId,
				tokenHash: this.hashRefreshToken(rawRefreshToken),
				expiresAt: refreshTokenExpiresAt,
			},
			{ transaction }
		)

		if (!refreshTokenRecord) {
			throw new AppException('Failed to issue refresh token!', 500)
		}

		return {
			accessToken,
			accessTokenExpiresAt,
			refreshToken: rawRefreshToken,
			refreshTokenExpiresAt,
			refreshTokenRecord,
		}
	}

	public async verifyToken(token: string) {
		try {
			const decoded = jwt.verify(token, appConfig.JWT_SECRET)
			return decoded
		} catch (error) {
			if (error instanceof jwt.TokenExpiredError) {
				throw new AppException('Expired Access Token', 401)
			} else {
				const err = error as Error
				throw new AppException(err.message, 401)
			}
		}
	}

	public async signIn(userData: InferAttributes<User>) {
		const user = await this.userRepository.findByEmail(userData.email)

		if (!user) throw new AppException('Invalid email or password!', 401)

		const checkPass = await this.passwordService.verifyPassword(
			userData?.password || '',
			user?.password || ''
		)

		if (!checkPass)
			throw new AppException('Invalid email or password!', 401)

		this.assertActiveUser(user.status)

		const { refreshTokenRecord: _refreshTokenRecord, ...tokens } =
			await this.issueTokenPair(user.id)

		return {
			user: { name: user.name, email: user.email },
			...tokens,
		}
	}

	/**
	 * Rotates a refresh token: validates the presented raw token against its stored hash,
	 * rejects it if expired/already revoked, then atomically revokes it and issues a new
	 * access + refresh token pair (revoke + create happen in a single transaction so a
	 * failure never leaves a token both "used" and without a replacement).
	 */
	public async refreshToken(
		rawRefreshToken: string
	): Promise<refreshTokenResponseType> {
		const tokenHash = this.hashRefreshToken(rawRefreshToken)

		const existingToken =
			await this.refreshTokenRepository.findByTokenHash(tokenHash)

		if (!existingToken) {
			throw new AppException('Invalid refresh token!', 401)
		}

		if (existingToken.revokedAt) {
			// A previously-revoked/rotated token being presented again is a strong signal
			// of token theft — defensively revoke every other active token for this user.
			await this.refreshTokenRepository.revokeAllActiveForUser(
				existingToken.userId
			)

			throw new AppException(
				'Refresh token has already been used or revoked!',
				401
			)
		}

		if (existingToken.expiresAt.getTime() < Date.now()) {
			throw new AppException('Refresh token has expired!', 401)
		}

		const user = await this.userRepository.findByPk(existingToken.userId)

		if (!user) {
			throw new AppException('Invalid refresh token!', 401)
		}

		this.assertActiveUser(user.status)

		return await sequelize.transaction(async (t: Transaction) => {
			const { refreshTokenRecord, ...tokens } = await this.issueTokenPair(
				user.id,
				t
			)

			await this.refreshTokenRepository.revoke(
				existingToken.id,
				refreshTokenRecord.id,
				t
			)

			return tokens
		})
	}

	/**
	 * Server-side revocation for logout: looks the presented raw token up by its hash and
	 * revokes it if it's currently active. Deliberately idempotent and silent on an
	 * unknown/already-revoked/expired token — a client calling logout twice, or with a stale
	 * token, still gets a success response, and this endpoint never reveals whether a given
	 * refresh token exists. No transaction needed: a single conditional write.
	 */
	public async logout(rawRefreshToken: string): Promise<void> {
		const tokenHash = this.hashRefreshToken(rawRefreshToken)
		const existingToken =
			await this.refreshTokenRepository.findByTokenHash(tokenHash)

		if (existingToken && !existingToken.revokedAt) {
			await this.refreshTokenRepository.revoke(existingToken.id, null)
		}
	}

	public async forgotPassword(email: string, redirectTo: string) {
		const user = await this.userRepository.findByEmail(email, {})
		if (!user) {
			throw new AppException('Login user not found!', 404)
		}

		if (user.status !== USER_STATUS.ACTIVE) {
			throw new AppException('Login user is not active!', 403)
		}

		const token = jwt.sign(
			{ email: user.email, userId: user.id },
			appConfig.JWT_SECRET,
			{
				expiresIn: '1h',
			}
		)

		const callbackUrl = `${redirectTo}?token=${token}`

		try {
			const emailData: SendGridEmailOptions = {
				from: {
					email: appConfig.SENDGRID_ACCOUNT_EMAIL,
					name: 'M Money',
				},
				to: {
					email,
				},
				subject: 'Reset your password',
				dynamicTemplateData: {
					name: user.name,
					callbackUrl,
					subject: 'Reset your password',
				},
				templateId: appConfig.SENDGRID_FORGET_PASSWORD_TEMPLATE_ID,
			}

			this.emailService.send(emailData)
		} catch (error) {
			throw new AppException('Failed to send forget password email!', 400)
		}
	}

	public async resetPassword(
		userId: number,
		password: string
	): Promise<void> {
		const hashedPassword = await this.passwordService.hashPassword(password)

		const [affectedCount] = await this.userRepository.update(
			{ password: hashedPassword },
			{
				where: {
					id: userId,
				},
				returning: ['name'],
			}
		)

		if (!affectedCount) {
			throw new AppException('User not found', 404)
		}
	}

	public async findUserById(userId: number): Promise<User | null> {
		return await this.userRepository.findByPk(userId)
	}

	public async signUp(userData: InferAttributes<User>) {
		const hashedPassword = await this.passwordService.hashPassword(
			userData?.password || ''
		)

		const newUser = await sequelize.transaction(async (t: Transaction) => {
			const existingUser = await this.userRepository.findByEmail(
				userData.email,
				{
					transaction: t,
				}
			)

			if (existingUser)
				throw new AppException('User is already registered!', 400)

			return await this.userRepository.create(
				{
					...userData,
					password: hashedPassword,
				},
				{ transaction: t }
			)
		})

		if (!newUser) {
			throw new AppException('Something went wrong!', 400)
		}

		const jwtPayload = {
			userId: newUser.id,
		}

		const token = jwt.sign(jwtPayload, appConfig.JWT_SECRET)

		return { userId: newUser.id, accessToken: token }
	}

	public async findUserWithRelations(userId: number) {
		const user = await sequelize.query<UserWithRelations>(
			`SELECT
				users.id,
				users.name,
				users.email,
				users.status,
				GROUP_CONCAT(DISTINCT roles.name ORDER BY roles.name SEPARATOR '|') AS roles,
				GROUP_CONCAT(DISTINCT permissions.name ORDER BY permissions.name SEPARATOR '|') AS permissions
			FROM users
			LEFT JOIN user_roles ON user_roles.user_id = users.id
			LEFT JOIN roles ON roles.id = user_roles.role_id
			LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
			LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
			WHERE users.id = ?
			GROUP BY users.id`,
			{
				replacements: [userId],
				plain: true,
				type: QueryTypes.SELECT,
			}
		)

		return user
	}

	/**
	 * Updates the authenticated user's own profile (first/last name, email,
	 * username, country). Full-replace semantics (PUT): `countryId` omitted or
	 * `null` clears the user's country, matching `UpdateProfileDTO`.
	 *
	 * Note: `name` (legacy single-field display name, still read by
	 * `signIn`/`forgotPassword`/`findUserWithRelations`) is kept in sync from
	 * `firstName`/`lastName` here so those existing call sites don't go stale.
	 */
	public async updateProfile(
		userId: number,
		data: UpdateProfileDTO
	): Promise<UpdateProfileResponseType> {
		const { firstName, lastName, email, username, countryId } = data

		const user = await this.userRepository.findByPk(userId)

		if (!user) {
			throw new AppException('User not found!', 404)
		}

		const duplicateUser = await this.userRepository.findOne({
			where: {
				id: { [Op.ne]: userId },
				[Op.or]: [{ email }, { username }],
			},
		})

		if (duplicateUser) {
			if (duplicateUser.email === email) {
				throw new AppException('Email already in use!', 409)
			}
			throw new AppException('Username already in use!', 409)
		}

		const normalizedCountryId = countryId ?? null
		let country = null

		if (normalizedCountryId !== null) {
			country = await this.countryRepository.findByPk(normalizedCountryId, {
				attributes: ['id', 'code', 'name'],
			})

			if (!country) {
				throw new AppException('Country not found!', 400)
			}
		}

		const fullName = `${firstName} ${lastName}`.trim()

		const updatedUser = await sequelize.transaction(
			async (transaction: Transaction) => {
				// Update the already-fetched instance directly rather than
				// `repository.update(..., { returning: true })`: this project's
				// DB dialect is MySQL, which doesn't support `RETURNING`, so
				// `returning: true` resolves as a bare affected count, not the
				// updated row (see CountryService.updateCountry for the same fix).
				return user.update(
					{
						firstName,
						lastName,
						email,
						username,
						countryId: normalizedCountryId,
						name: fullName,
					},
					{ transaction }
				)
			}
		)

		return {
			id: updatedUser.id,
			fullName,
			email: updatedUser.email,
			username: updatedUser.username,
			country: country
				? { id: country.id, code: country.code, name: country.name }
				: null,
		}
	}
}

export default AuthService
