import { inject, injectable } from 'inversify'
import { Request, Response } from 'express'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import { TYPES } from '../containers/inversifyTypes'
import { IAuthService } from '../interfaces/service/IAuthService'

@injectable()
export default class AuthController {
	constructor(
		@inject(TYPES.IAuthService) private authService: IAuthService
	) {}

	public signIn = asyncHandler(async (req: Request, res: Response) => {
		const data = await this.authService.signIn(req.body)

		responseHandler(res, 200, {
			message: 'Success',
			data,
		})
	})

	public refreshToken = asyncHandler(async (req: Request, res: Response) => {
		const { refreshToken } = req.body
		const data = await this.authService.refreshToken(refreshToken)

		responseHandler(res, 200, {
			message: 'Success',
			data,
		})
	})

	public forgotPassword = asyncHandler(
		async (req: Request, res: Response) => {
			const { email, redirectTo } = req.body
			const data = await this.authService.forgotPassword(
				email,
				redirectTo
			)

			responseHandler(res, 200, {
				message: 'Success',
				data,
			})
		}
	)

	public resetPassword = asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.user
		const data = await this.authService.resetPassword(id, req.body.password)

		responseHandler(res, 200, {
			message: 'Success',
			data,
		})
	})

	public getMe = asyncHandler(async (req: Request, res: Response) => {
		const user = req.user
		responseHandler(res, 200, {
			message: 'Success',
			data: user,
		})
	})

	public logOut = asyncHandler(async (req: Request, res: Response) => {
		const { refreshToken } = req.body
		await this.authService.logout(refreshToken)

		responseHandler(res, 200, {
			message: 'Logged out successfully.',
		})
	})

	public updateProfile = asyncHandler(async (req: Request, res: Response) => {
		const { id } = req.user
		const data = await this.authService.updateProfile(id, req.body)

		responseHandler(res, 200, {
			message: 'Success',
			data,
		})
	})
}
