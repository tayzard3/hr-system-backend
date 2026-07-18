import { NextFunction, Request, Response } from 'express'
import AppException from '../exceptions/AppException'

export const can = (requiredPermissions: string | string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const ability = req.ability

		if (!ability) {
			return next(
				new AppException('Authorization ability not initialized!', 403)
			)
		}

		const permissionsToCheck = Array.isArray(requiredPermissions)
			? requiredPermissions
			: [requiredPermissions]

		const hasPermission = permissionsToCheck.some((permission) => {
			if (ability.can('Manage', 'All')) {
				// Developer, bypass all specific checks
				return true
			}

			const [subject, action] = permission.split('_')
			if (action && subject) {
				return ability.can(action, subject)
			}
		})

		if (hasPermission) {
			next()
		} else {
			return next(
				new AppException(
					'Forbidden: You do not have the required permissions!',
					403
				)
			)
		}
	}
}
