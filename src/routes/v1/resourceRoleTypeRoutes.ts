import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { ResourceRoleTypeController } from '../../controllers/ResourceRoleTypeController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { RESOURCE_ROLE_TYPE_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createResourceRoleTypeSchema,
	updateResourceRoleTypeSchema,
} from '../../validation/resourceRoleTypeSchema'

const router = Router()
const resourceRoleTypeController = container.get<ResourceRoleTypeController>(
	TYPES.ResourceRoleTypeController
)

router
	.route('/')
	.get(
		can(RESOURCE_ROLE_TYPE_PERMISSION.LIST),
		resourceRoleTypeController.getAllResourceRoleTypes
	)
	.post(
		can(RESOURCE_ROLE_TYPE_PERMISSION.CREATE),
		zodSchemaValidator(createResourceRoleTypeSchema),
		resourceRoleTypeController.createResourceRoleType
	)
router
	.route('/:id')
	.get(
		can(RESOURCE_ROLE_TYPE_PERMISSION.LIST),
		resourceRoleTypeController.getResourceRoleTypeById
	)
	.put(
		can(RESOURCE_ROLE_TYPE_PERMISSION.UPDATE),
		zodSchemaValidator(updateResourceRoleTypeSchema),
		resourceRoleTypeController.updateResourceRoleType
	)
	.delete(
		can(RESOURCE_ROLE_TYPE_PERMISSION.DELETE),
		resourceRoleTypeController.deleteResourceRoleType
	)

export default router
