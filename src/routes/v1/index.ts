import { Router } from 'express'
import authRoutes from './authRoutes'
import userRoutes from './userRoutes'
import roleRoutes from './roleRoutes'
import permissionRoutes from './permissionRoutes'
import countryRoutes from './countryRoutes'
import currencyRoutes from './currencyRoutes'
import projectRoutes from './projectRoutes'
import resourceRoleTypeRoutes from './resourceRoleTypeRoutes'
import timesheetPeriodRoutes from './timesheetPeriodRoutes'
import timesheetEntryRoutes from './timesheetEntryRoutes'
import rateCardRoutes from './rateCardRoutes'
import { protect } from '../../middlewares/authMiddleware'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', protect, userRoutes)
router.use('/roles', protect, roleRoutes)
router.use('/permissions', protect, permissionRoutes)
router.use('/countries', protect, countryRoutes)
router.use('/currencies', protect, currencyRoutes)
router.use('/projects', protect, projectRoutes)
router.use('/resource-role-types', protect, resourceRoleTypeRoutes)
router.use('/timesheet-periods', protect, timesheetPeriodRoutes)
router.use('/timesheet-entries', protect, timesheetEntryRoutes)
router.use('/rate-cards', protect, rateCardRoutes)

export default router
