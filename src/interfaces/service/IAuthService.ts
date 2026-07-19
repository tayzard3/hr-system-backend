import { NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../../models/User'
import {
	ChangePasswordDTO,
	refreshTokenResponseType,
	signInResponseType,
	signUpResponseType,
	UpdateProfileDTO,
	UpdateProfileResponseType,
} from '../../types/authServiceTypes'
import { InferAttributes } from 'sequelize'
import { UserWithRelations } from '../../types/userTypes'

export interface IAuthService {
	verifyToken(
		token: string,
		next: NextFunction
	): Promise<string | void | jwt.JwtPayload>
	signIn(
		userData: InferAttributes<User>
	): Promise<signInResponseType | undefined>
	refreshToken(rawRefreshToken: string): Promise<refreshTokenResponseType>
	logout(rawRefreshToken: string): Promise<void>
	forgotPassword(email: string, redirectTo: string): Promise<void>
	resetPassword(userId: number, password: string): Promise<void>
	signUp(userData: InferAttributes<User>): Promise<signUpResponseType | null>
	findUserById(userId: number): Promise<User | null>
	findUserWithRelations(userId: number): Promise<UserWithRelations | null>
	updateProfile(
		userId: number,
		data: UpdateProfileDTO
	): Promise<UpdateProfileResponseType>
	changePassword(userId: number, data: ChangePasswordDTO): Promise<void>
}
