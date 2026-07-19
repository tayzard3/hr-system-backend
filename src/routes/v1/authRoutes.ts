import express from 'express'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	changePasswordSchema,
	forgetPasswordSchema,
	refreshTokenSchema,
	resetPasswordSchema,
	signInSchema,
	updateProfileSchema,
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
	.route('/refresh-token')
	.post(zodSchemaValidator(refreshTokenSchema), authController.refreshToken)
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
router
	.route('/update-profile')
	.put(
		protect,
		zodSchemaValidator(updateProfileSchema),
		authController.updateProfile
	)
router
	.route('/logout')
	.post(zodSchemaValidator(refreshTokenSchema), authController.logOut)
router
	.route('/change-password')
	.post(
		protect,
		zodSchemaValidator(changePasswordSchema),
		authController.changePassword
	)

const authRoutes = router
export default authRoutes
