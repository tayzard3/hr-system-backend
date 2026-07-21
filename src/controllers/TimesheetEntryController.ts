import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { ITimesheetEntryService } from '../interfaces/service/ITimesheetEntryService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'

/** Spec-mandated default page size for `GetAllTimesheetEntries` (50) —
 * intentionally a fixed literal rather than `appConfig.DEFAULT_PAGINATE`
 * (which backs the generic list endpoints elsewhere in this codebase), since
 * the API spec calls out `50` specifically for this endpoint. */
const DEFAULT_TIMESHEET_ENTRY_PAGE_SIZE = 50

@injectable()
export class TimesheetEntryController {
	constructor(
		@inject(TYPES.ITimesheetEntryService)
		private timesheetEntryService: ITimesheetEntryService
	) {}

	/** `TimesheetEntry_ManageAll` is what lets a caller see/act on entries
	 * that aren't their own (see the permission's doc-comment in
	 * `src/constants/permission.ts`). Computed here from `req.ability` —
	 * same "derive a boolean off `req` in the controller, pass it into the
	 * service" pattern as `RoleController.getAllRoles`'s `isDeveloper` flag —
	 * so the service itself never touches `req`. */
	private canManageAll(req: Request): boolean {
		return req.ability.can('ManageAll', 'TimesheetEntry')
	}

	public getAllTimesheetEntries = asyncHandler(
		async (req: Request, res: Response) => {
			const options = {
				userId: req.query.userId
					? parseInt(req.query.userId as string, 10)
					: undefined,
				projectId: req.query.projectId
					? parseInt(req.query.projectId as string, 10)
					: undefined,
				startDate: req.query.startDate as string | undefined,
				endDate: req.query.endDate as string | undefined,
				timesheetPeriodId: req.query.timesheetPeriodId
					? parseInt(req.query.timesheetPeriodId as string, 10)
					: undefined,
				isApproved:
					req.query.isApproved !== undefined
						? req.query.isApproved === 'true'
						: undefined,
				page: parseInt(req.query.page as string, 10) || 1,
				perPage:
					parseInt(req.query.pageSize as string, 10) ||
					DEFAULT_TIMESHEET_ENTRY_PAGE_SIZE,
			}

			const result = await this.timesheetEntryService.getAllTimesheetEntries(
				options,
				req.user.id,
				this.canManageAll(req)
			)

			responseHandler(res, 200, {
				message: 'Timesheet entries retrieved successfully',
				data: result,
			})
		}
	)

	public getTimesheetEntryById = asyncHandler(
		async (req: Request, res: Response) => {
			const entry = await this.timesheetEntryService.getTimesheetEntryById(
				parseInt(req.params.id as string, 10),
				req.user.id,
				this.canManageAll(req)
			)
			responseHandler(res, 200, {
				message: 'Timesheet entry retrieved successfully',
				data: entry,
			})
		}
	)

	public createTimesheetEntry = asyncHandler(
		async (req: Request, res: Response) => {
			const entry = await this.timesheetEntryService.createTimesheetEntry(
				req.body,
				req.user.id
			)
			responseHandler(res, 201, {
				message: 'Timesheet entry created successfully',
				data: entry,
			})
		}
	)

	public updateTimesheetEntry = asyncHandler(
		async (req: Request, res: Response) => {
			const entry = await this.timesheetEntryService.updateTimesheetEntry(
				parseInt(req.params.id as string, 10),
				req.body,
				req.user.id
			)
			responseHandler(res, 200, {
				message: 'Timesheet entry updated successfully',
				data: entry,
			})
		}
	)

	public deleteTimesheetEntry = asyncHandler(
		async (req: Request, res: Response) => {
			const deleted = await this.timesheetEntryService.deleteTimesheetEntry(
				parseInt(req.params.id as string, 10),
				req.user.id,
				this.canManageAll(req)
			)
			if (!deleted) {
				return responseHandler(res, 404, {
					message: 'Timesheet entry not found',
				})
			}
			responseHandler(res, 200, { message: 'Entry deleted.' })
		}
	)

	public approveTimesheetEntry = asyncHandler(
		async (req: Request, res: Response) => {
			const entry = await this.timesheetEntryService.approveTimesheetEntry(
				parseInt(req.params.id as string, 10),
				req.user.id
			)
			responseHandler(res, 200, {
				message: 'Timesheet entry approved successfully',
				data: entry,
			})
		}
	)

	public unapproveTimesheetEntry = asyncHandler(
		async (req: Request, res: Response) => {
			await this.timesheetEntryService.unapproveTimesheetEntry(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, { message: 'Approval reversed.' })
		}
	)

	public bulkApproveTimesheetEntries = asyncHandler(
		async (req: Request, res: Response) => {
			const result =
				await this.timesheetEntryService.bulkApproveTimesheetEntries(
					req.body.entryIds,
					req.user.id
				)
			responseHandler(res, 200, {
				message: 'Timesheet entries approved successfully',
				data: result,
			})
		}
	)
}
