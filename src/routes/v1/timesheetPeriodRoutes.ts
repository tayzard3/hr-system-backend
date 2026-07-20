import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { TimesheetPeriodController } from '../../controllers/TimesheetPeriodController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { TIMESHEET_PERIOD_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import { createTimesheetPeriodSchema } from '../../validation/timesheetPeriodSchema'

const router = Router()
const timesheetPeriodController = container.get<TimesheetPeriodController>(
	TYPES.TimesheetPeriodController
)

router
	.route('/')
	.get(
		can(TIMESHEET_PERIOD_PERMISSION.LIST),
		timesheetPeriodController.getAllTimesheetPeriods
	)
	.post(
		can(TIMESHEET_PERIOD_PERMISSION.CREATE),
		zodSchemaValidator(createTimesheetPeriodSchema),
		timesheetPeriodController.createTimesheetPeriod
	)
router
	.route('/:id')
	.get(
		can(TIMESHEET_PERIOD_PERMISSION.LIST),
		timesheetPeriodController.getTimesheetPeriodById
	)
	.delete(
		can(TIMESHEET_PERIOD_PERMISSION.DELETE),
		timesheetPeriodController.deleteTimesheetPeriod
	)
router
	.route('/:id/lock')
	.put(
		can(TIMESHEET_PERIOD_PERMISSION.LOCK),
		timesheetPeriodController.lockTimesheetPeriod
	)
router
	.route('/:id/unlock')
	.put(
		can(TIMESHEET_PERIOD_PERMISSION.UNLOCK),
		timesheetPeriodController.unlockTimesheetPeriod
	)

export default router
