import { NextFunction, Request, Response } from 'express'

interface ResponseData<T> {
	message: string
	data?: T
}

export interface ApiResponseBody<T = object> {
	statusCode: number
	isSuccess: boolean
	message: string
	data: T
}

export const isSuccessStatusCode = (statusCode: number): boolean =>
	statusCode >= 200 && statusCode < 300

/**
 * Single funnel for every API response body. The HTTP status code is always
 * 200 — the logical outcome lives in `statusCode`/`isSuccess` in the body.
 */
export const sendApiResponse = <T>(
	res: Response,
	statusCode: number,
	message: string,
	data?: T
): Response => {
	const body: ApiResponseBody<T | object> = {
		statusCode,
		isSuccess: isSuccessStatusCode(statusCode),
		message,
		data: data ?? {},
	}

	return res.status(200).json(body)
}

export const responseHandler = <T>(
	res: Response,
	statusCode: number,
	responseData: ResponseData<T>
): Response => {
	return sendApiResponse(
		res,
		statusCode,
		responseData.message,
		responseData.data
	)
}

type AsyncController<T> = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<T>

export const asyncHandler =
	<T>(fn: AsyncController<T>) =>
	(req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next)
	}
