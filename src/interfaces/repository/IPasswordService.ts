export interface IPasswordService {
	hashPassword(plainPassword: string): Promise<string>
	verifyPassword(
		plainPassword: string,
		hashedPassword: string
	): Promise<boolean>
}
