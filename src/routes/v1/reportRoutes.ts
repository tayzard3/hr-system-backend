import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { ReportController } from '../../controllers/ReportController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { REPORT_PERMISSION } from '../../constants'

const router = Router()
const reportController = container.get<ReportController>(TYPES.ReportController)

router
	.route('/timesheet')
	.get(can(REPORT_PERMISSION.VIEW), reportController.generateTimesheetReport)
router
	.route('/timesheet/export')
	.get(can(REPORT_PERMISSION.EXPORT), reportController.exportTimesheetReport)

router
	.route('/user-roles-summary')
	.get(can(REPORT_PERMISSION.VIEW), reportController.generateUserRolesSummary)
router
	.route('/user-roles-summary/export')
	.get(can(REPORT_PERMISSION.EXPORT), reportController.exportUserRolesSummary)

router
	.route('/monthly-cost-revenue')
	.get(can(REPORT_PERMISSION.VIEW), reportController.generateMonthlyCostRevenue)
router
	.route('/monthly-cost-revenue/export')
	.get(can(REPORT_PERMISSION.EXPORT), reportController.exportMonthlyCostRevenue)

export default router
