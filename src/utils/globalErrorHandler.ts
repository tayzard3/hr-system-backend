/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextFunction, Request, Response } from 'express'
import AppException from '../exceptions/AppException'
import { sendApiResponse } from './responseHandler'
import { AppLogger } from './Log'

export const globalErrorHandler = (
	err: Error | AppException,
	req: Request,
	res: Response,
	_: NextFunction //don't delete
) => {
	let statusCode = 500
	let message = err.message || 'Internal server error'
	let data: object = {}

	if (err instanceof AppException) {
		statusCode = err.statusCode
		message = err.message
		if (err.errorValidations) {
			data = { errors: err.errorValidations }
		}
	}

	AppLogger.error(err.stack || 'Unknown error')

	sendApiResponse(res, statusCode, message, data)
}

export const throwErr = (message: string): never => {
	throw new Error(message)
}

export default globalErrorHandler
