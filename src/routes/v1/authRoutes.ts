import express from 'express'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	forgetPasswordSchema,
	resetPasswordSchema,
	signInSchema,
} from '../../validation/authSchema'
import AuthController from '../../controllers/AuthController'
import { TYPES } from '../../containers/inversifyTypes'
import { container } from '../../containers/inversify.config'
import { protect } from '../../middlewares/authMiddleware'

const router = express.Router()
const authController = container.get<AuthController>(TYPES.AuthController)

router
	.route('/sign-in')
	.post(zodSchemaValidator(signInSchema), authController.signIn)
router
	.route('/forget-password')
	.post(
		zodSchemaValidator(forgetPasswordSchema),
		authController.forgotPassword
	)
router
	.route('/reset-password')
	.post(
		protect,
		zodSchemaValidator(resetPasswordSchema),
		authController.resetPassword
	)
router.route('/me').get(protect, authController.getMe)
router.route('/logout').post(authController.logOut)

const authRoutes = router
export default authRoutes
