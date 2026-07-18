import { NextFunction, Request, Response } from 'express'
import AppException from '../exceptions/AppException'
import { tokenAttributes } from '../types/authServiceTypes'
import AuthService from '../services/AuthService'
import { container } from '../containers/inversify.config'
import { TYPES } from '../containers/inversifyTypes'
import { defineAbilitiesFor } from '../casl/ability'

const authService = container.get<AuthService>(TYPES.IAuthService)

export const protect = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const authHeader = req.headers['authorization']

		if (!authHeader) throw new AppException('Authorization required!', 401)

		const [type, token] = authHeader.split(' ')

		if (type !== 'Bearer' || !token) {
			throw new AppException('Invalid token type!', 401)
		}

		const decoded = (await authService.verifyToken(token)) as tokenAttributes

		if (!decoded) {
			return next(new AppException('Invalid token!', 401))
		}

		//check user from decoded result
		const user = await authService.findUserWithRelations(decoded.userId)

		if (!user) {
			return next(new AppException('Invalid user!', 401))
		}

		req.user = {
			id: user.id,
			email: user.email,
			name: user.name,
			roles: user.roles ? user.roles.split('|').map((r) => r) : [],
			permissions: user.permissions
				? user.permissions.split('|').map((r) => r)
				: [],
		}

		req.ability = defineAbilitiesFor(req.user)
		req.token = token

		next()
	} catch (error) {
		next(error)
	}
}
