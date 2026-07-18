import { Router } from 'express'
import authRoutes from './authRoutes'
import userRoutes from './userRoutes'
import roleRoutes from './roleRoutes'
import permissionRoutes from './permissionRoutes'
import { protect } from '../../middlewares/authMiddleware'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', protect, userRoutes)
router.use('/roles', protect, roleRoutes)
router.use('/permissions', protect, permissionRoutes)

export default router
