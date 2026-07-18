import { Request, Response, NextFunction } from 'express'

export function timingMiddleware(
	_req: Request,
	res: Response,
	next: NextFunction
) {
	// Store the current timestamp in res.locals.startTimestamp
	res.locals.startTimestamp = Date.now()
	next() // Continue processing the request
}
