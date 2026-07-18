import { injectable } from 'inversify'
import appConfig from '../utils/config'
import { BcryptJS } from '../utils/PasswordUtility'
import { IPasswordService } from '../interfaces/repository/IPasswordService'

@injectable()
export class BcryptService implements IPasswordService {
	bcryptService: BcryptJS

	constructor() {
		this.bcryptService = new BcryptJS(parseInt(appConfig.BCRYPTJS_SALT))
	}

	async hashPassword(plainPassword: string) {
		return await this.bcryptService.hashPassword(plainPassword)
	}

	async verifyPassword(plainPassword: string, hashedPassword: string) {
		return await this.bcryptService.verifyPassword(
			plainPassword,
			hashedPassword
		)
	}
}
