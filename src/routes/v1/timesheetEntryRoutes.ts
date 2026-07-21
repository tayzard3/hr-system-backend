import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { TimesheetEntryController } from '../../controllers/TimesheetEntryController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { TIMESHEET_ENTRY_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	bulkApproveTimesheetEntriesSchema,
	createTimesheetEntrySchema,
	updateTimesheetEntrySchema,
} from '../../validation/timesheetEntrySchema'

const router = Router()
const timesheetEntryController = container.get<TimesheetEntryController>(
	TYPES.TimesheetEntryController
)

router
	.route('/')
	.get(
		can(TIMESHEET_ENTRY_PERMISSION.LIST),
		timesheetEntryController.getAllTimesheetEntries
	)
	.post(
		can(TIMESHEET_ENTRY_PERMISSION.CREATE),
		zodSchemaValidator(createTimesheetEntrySchema),
		timesheetEntryController.createTimesheetEntry
	)
router
	.route('/bulk-approve')
	.post(
		can(TIMESHEET_ENTRY_PERMISSION.APPROVE),
		zodSchemaValidator(bulkApproveTimesheetEntriesSchema),
		timesheetEntryController.bulkApproveTimesheetEntries
	)
router
	.route('/:id')
	.get(
		can(TIMESHEET_ENTRY_PERMISSION.LIST),
		timesheetEntryController.getTimesheetEntryById
	)
	.put(
		can(TIMESHEET_ENTRY_PERMISSION.UPDATE),
		zodSchemaValidator(updateTimesheetEntrySchema),
		timesheetEntryController.updateTimesheetEntry
	)
	.delete(
		can(TIMESHEET_ENTRY_PERMISSION.DELETE),
		timesheetEntryController.deleteTimesheetEntry
	)
router
	.route('/:id/approve')
	.put(
		can(TIMESHEET_ENTRY_PERMISSION.APPROVE),
		timesheetEntryController.approveTimesheetEntry
	)
router
	.route('/:id/unapprove')
	.put(
		can(TIMESHEET_ENTRY_PERMISSION.UNAPPROVE),
		timesheetEntryController.unapproveTimesheetEntry
	)

export default router
