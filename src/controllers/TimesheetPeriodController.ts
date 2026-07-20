import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { ITimesheetPeriodService } from '../interfaces/service/ITimesheetPeriodService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'

@injectable()
export class TimesheetPeriodController {
	constructor(
		@inject(TYPES.ITimesheetPeriodService)
		private timesheetPeriodService: ITimesheetPeriodService
	) {}

	public getAllTimesheetPeriods = asyncHandler(
		async (req: Request, res: Response) => {
			const options = {
				isLocked:
					req.query.isLocked !== undefined
						? req.query.isLocked === 'true'
						: undefined,
				year: req.query.year
					? parseInt(req.query.year as string, 10)
					: undefined,
				month: req.query.month
					? parseInt(req.query.month as string, 10)
					: undefined,
			}

			const periods =
				await this.timesheetPeriodService.getAllTimesheetPeriods(options)

			responseHandler(res, 200, {
				message: 'Timesheet periods retrieved successfully',
				data: periods,
			})
		}
	)

	public getTimesheetPeriodById = asyncHandler(
		async (req: Request, res: Response) => {
			const period = await this.timesheetPeriodService.getTimesheetPeriodById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Timesheet period retrieved successfully',
				data: period,
			})
		}
	)

	public createTimesheetPeriod = asyncHandler(
		async (req: Request, res: Response) => {
			const period = await this.timesheetPeriodService.createTimesheetPeriod(
				req.body
			)
			responseHandler(res, 201, {
				message: 'Timesheet period created successfully',
				data: period,
			})
		}
	)

	public lockTimesheetPeriod = asyncHandler(
		async (req: Request, res: Response) => {
			const period = await this.timesheetPeriodService.lockTimesheetPeriod(
				parseInt(req.params.id as string, 10),
				req.user.id
			)
			responseHandler(res, 200, {
				message: 'Timesheet period locked successfully',
				data: period,
			})
		}
	)

	public unlockTimesheetPeriod = asyncHandler(
		async (req: Request, res: Response) => {
			const period = await this.timesheetPeriodService.unlockTimesheetPeriod(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Timesheet period unlocked successfully',
				data: period,
			})
		}
	)

	public deleteTimesheetPeriod = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.timesheetPeriodService.deleteTimesheetPeriod(
				parseInt(req.params.id as string, 10)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Timesheet period not found',
				})
			}
			responseHandler(res, 200, {
				message: 'Timesheet period deleted successfully',
			})
		}
	)
}
