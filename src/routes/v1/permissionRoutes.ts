import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { PermissionController } from '../../controllers/PermissionController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { PERMISSION_PERMISSION, ROLE_PERMISSION } from '../../constants'

const router = Router()
const permissionController = container.get<PermissionController>(
	TYPES.PermissionController
)

router
	.route('/')
	.get(
		can([ROLE_PERMISSION.LIST, PERMISSION_PERMISSION.LIST]),
		permissionController.getAllPermissions
	)
	.post(
		can(PERMISSION_PERMISSION.CREATE),
		permissionController.createPermission
	)
router
	.route('/:id')
	.get(can(PERMISSION_PERMISSION.LIST), permissionController.getPermissionById)
	.post(
		can(PERMISSION_PERMISSION.UPDATE),
		permissionController.updatePermission
	)
	.delete(
		can(PERMISSION_PERMISSION.DELETE),
		permissionController.deletePermission
	)

export default router
