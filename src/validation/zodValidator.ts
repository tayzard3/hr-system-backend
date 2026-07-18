import { ZodError, ZodSchema } from 'zod'
import { Request, Response, NextFunction } from 'express'
import { sendApiResponse } from '../utils/responseHandler'

const supportedMethods: Array<string> = ['post', 'put', 'delete', 'patch']

const zodSchemaValidator = <T>(
	schema: ZodSchema<T>,
	returnZodError: boolean = true
) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const method: string = req.method.toLowerCase()
		const reqBody = req.body
		if (!supportedMethods.includes(method)) {
			return next()
		}

		if (!schema) {
			sendApiResponse(res, 500, 'Validation schema is not defined!')
			return
		}

		if (!reqBody) {
			sendApiResponse(res, 400, 'Wrong request body!')
			return
		}

		try {
			const value = schema.parse(reqBody)
			req.body.data = value
			next()
		} catch (error) {
			if (error instanceof ZodError && returnZodError) {
				sendApiResponse(
					res,
					422,
					'Invalid request. Please review request and try again!',
					{ errors: formatZodError(error) }
				)
				return
			}

			sendApiResponse(
				res,
				422,
				'Invalid request. Please review request and try again!'
			)
		}
	}
}

export const formatZodError = (error: ZodError) => {
	return error.errors.map((err) => ({
		path: err.path.join('.'),
		message: err.message,
	}))
}

export const formatZodErrorToMessage = (error: ZodError) => {
	return error.errors
		.map((error) => `${error.path.join('.')}: ${error.message}`)
		.join(', ')
}

export default zodSchemaValidator
