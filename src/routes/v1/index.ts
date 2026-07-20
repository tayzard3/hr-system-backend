import { Router } from 'express'
import authRoutes from './authRoutes'
import userRoutes from './userRoutes'
import roleRoutes from './roleRoutes'
import permissionRoutes from './permissionRoutes'
import countryRoutes from './countryRoutes'
import projectRoutes from './projectRoutes'
import resourceRoleTypeRoutes from './resourceRoleTypeRoutes'
import timesheetPeriodRoutes from './timesheetPeriodRoutes'
import { protect } from '../../middlewares/authMiddleware'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', protect, userRoutes)
router.use('/roles', protect, roleRoutes)
router.use('/permissions', protect, permissionRoutes)
router.use('/countries', protect, countryRoutes)
router.use('/projects', protect, projectRoutes)
router.use('/resource-role-types', protect, resourceRoleTypeRoutes)
router.use('/timesheet-periods', protect, timesheetPeriodRoutes)

export default router
