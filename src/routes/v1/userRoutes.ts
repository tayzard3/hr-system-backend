import express from 'express'
import { container } from '../../containers/inversify.config'
import { TYPES } from '../../containers/inversifyTypes'
import UserController from '../../controllers/UserController'
import zodSchemaValidator from '../../validation/zodValidator'
import { updateUserSchema } from '../../validation/authSchema'
import { can } from '../../middlewares/permissionMiddleware'
import { DEVELOPER_PERMISSION, USER_PERMISSION } from '../../constants'

const router = express.Router()
const userController = container.get<UserController>(TYPES.UserController)

router
	.route('/')
	.get(can(USER_PERMISSION.LIST), userController.getAllUsers)
	.post(can(USER_PERMISSION.CREATE), userController.createUser)
router
	.route('/:userId')
	.get(can(USER_PERMISSION.LIST), userController.getUserById)
	.post(
		can(USER_PERMISSION.UPDATE),
		zodSchemaValidator(updateUserSchema),
		userController.updateUser
	)
	.delete(can(USER_PERMISSION.DELETE), userController.deleteUser)

router
	.route('/assign-role')
	.post(can(DEVELOPER_PERMISSION.MANAGE_ALL), userController.assignRole)

const userRoutes = router
export default userRoutes
