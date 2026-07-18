import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { RoleController } from '../../controllers/RoleController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { ROLE_PERMISSION, USER_PERMISSION } from '../../constants'

const router = Router()
const roleController = container.get<RoleController>(TYPES.RoleController)

router
	.route('/')
	.get(
		can([USER_PERMISSION.LIST, ROLE_PERMISSION.LIST]),
		roleController.getAllRoles
	)
	.post(can(ROLE_PERMISSION.CREATE), roleController.createRole)
router
	.route('/:id')
	.get(can(ROLE_PERMISSION.LIST), roleController.getRoleById)
	.post(can(ROLE_PERMISSION.UPDATE), roleController.updateRole)
	.delete(can(ROLE_PERMISSION.DELETE), roleController.deleteRole)

export default router
