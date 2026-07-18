import { injectable, inject } from 'inversify'
import { InferAttributes, QueryTypes, Transaction } from 'sequelize'
import AppException from '../exceptions/AppException'
import { sequelize } from '../models'
import { User } from '../models/User'
import appConfig from '../utils/config'
import jwt from 'jsonwebtoken'
import { IUserRepository } from '../interfaces/repository/IUserRepository'
import { TYPES } from '../containers/inversifyTypes'
import { IPasswordService } from '../interfaces/repository/IPasswordService'
import { IAuthService } from '../interfaces/service/IAuthService'
import { USER_STATUS } from '../constants'
import { IEmailService } from '../interfaces/service/IEmailService'
import { SendGridEmailOptions } from '../utils/Email'
import { UserWithRelations } from '../types/userTypes'

@injectable()
class AuthService implements IAuthService {
	constructor(
		@inject(TYPES.IUserRepository)
		private userRepository: IUserRepository,
		@inject(TYPES.IPasswordService)
		private passwordService: IPasswordService,
		@inject(TYPES.IEmailService) private emailService: IEmailService
	) {}

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

		if (!checkPass) throw new AppException('Invalid email or password!', 401)

		if (user.status !== USER_STATUS.ACTIVE) {
			throw new AppException(
				'Account not yet active. Please contact your support!',
				403
			)
		}

		const jwtPayload = {
			userId: user.id,
		}

		const token = jwt.sign(jwtPayload, appConfig.JWT_SECRET)

		return {
			user: { name: user.name, email: user.email },
			accessToken: token,
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

	public async resetPassword(userId: number, password: string): Promise<void> {
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
}

export default AuthService
