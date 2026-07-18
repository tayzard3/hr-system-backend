import bcrypt from 'bcryptjs'

export class BcryptJS {
	private saltRounds: number

	constructor(saltRounds: number = 10) {
		this.saltRounds = saltRounds
	}

	async hashPassword(plainPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt(this.saltRounds)
		const hashedPassword = await bcrypt.hash(plainPassword, salt)
		return hashedPassword
	}

	async verifyPassword(
		plainPassword: string,
		hashedPassword: string
	): Promise<boolean> {
		return await bcrypt.compare(plainPassword, hashedPassword)
	}
}

export default class PasswordUtility {
	static BcryptJS: typeof BcryptJS = BcryptJS
}
