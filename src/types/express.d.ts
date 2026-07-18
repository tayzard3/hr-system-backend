import { AuthenticatedUser } from './userTypes'
import { AppAbility } from '../casl/ability'

declare global {
	namespace Express {
		export interface Request {
			user: AuthenticatedUser
			token?: string
			ability: AppAbility
		}
		export interface Response {
			user: AuthenticatedUser
			token?: string
		}

		namespace Multer {
			interface File {
				path: string
				url?: string
			}
		}
	}
}

export {}
