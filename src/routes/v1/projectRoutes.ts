import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { ProjectController } from '../../controllers/ProjectController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { PROJECT_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createProjectSchema,
	updateProjectSchema,
} from '../../validation/projectSchema'
import { assignResourceSchema } from '../../validation/projectResourceAssignmentSchema'

const router = Router()
const projectController = container.get<ProjectController>(
	TYPES.ProjectController
)

router
	.route('/')
	.get(can(PROJECT_PERMISSION.LIST), projectController.getAllProjects)
	.post(
		can(PROJECT_PERMISSION.CREATE),
		zodSchemaValidator(createProjectSchema),
		projectController.createProject
	)
router
	.route('/:id')
	.get(can(PROJECT_PERMISSION.LIST), projectController.getProjectById)
	.put(
		can(PROJECT_PERMISSION.UPDATE),
		zodSchemaValidator(updateProjectSchema),
		projectController.updateProject
	)
	.delete(can(PROJECT_PERMISSION.DELETE), projectController.deleteProject)
router
	.route('/:id/assignments')
	.get(can(PROJECT_PERMISSION.LIST), projectController.getProjectAssignments)
	.post(
		can(PROJECT_PERMISSION.ASSIGN_RESOURCE),
		zodSchemaValidator(assignResourceSchema),
		projectController.assignResource
	)
router
	.route('/:id/assignments/:assignmentId')
	.delete(
		can(PROJECT_PERMISSION.REMOVE_RESOURCE),
		projectController.removeResource
	)

export default router
