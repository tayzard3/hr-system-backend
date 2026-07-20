import { Request, Response } from 'express'
import { inject, injectable } from 'inversify'
import { IProjectService } from '../interfaces/service/IProjectService'
import { IProjectResourceAssignmentService } from '../interfaces/service/IProjectResourceAssignmentService'
import { TYPES } from '../containers/inversifyTypes'
import { asyncHandler, responseHandler } from '../utils/responseHandler'
import appConfig from '../utils/config'

@injectable()
export class ProjectController {
	constructor(
		@inject(TYPES.IProjectService) private projectService: IProjectService,
		@inject(TYPES.IProjectResourceAssignmentService)
		private projectResourceAssignmentService: IProjectResourceAssignmentService
	) {}

	public getAllProjects = asyncHandler(
		async (req: Request, res: Response) => {
			const options = {
				page: parseInt(req.query.page as string, 10) || 1,
				perPage:
					parseInt(req.query.perPage as string, 10) ||
					parseInt(appConfig.DEFAULT_PAGINATE, 10),
				keyword: req.query.keyword as string | undefined,
				isActive:
					req.query.isActive !== undefined
						? req.query.isActive === 'true'
						: undefined,
				clientName: req.query.clientName as string | undefined,
			}

			const projects = await this.projectService.getAllProjects(options)

			responseHandler(res, 200, {
				message: 'Projects retrieved successfully',
				data: projects,
			})
		}
	)

	public createProject = asyncHandler(async (req: Request, res: Response) => {
		const project = await this.projectService.createProject(req.body)
		responseHandler(res, 201, {
			message: 'Project created successfully',
			data: project,
		})
	})

	public getProjectById = asyncHandler(
		async (req: Request, res: Response) => {
			const project = await this.projectService.getProjectById(
				parseInt(req.params.id as string, 10)
			)
			responseHandler(res, 200, {
				message: 'Project retrieved successfully',
				data: project,
			})
		}
	)

	public updateProject = asyncHandler(async (req: Request, res: Response) => {
		const project = await this.projectService.updateProject(
			parseInt(req.params.id as string, 10),
			req.body
		)
		if (!project) {
			return responseHandler(res, 404, { message: 'Project not found' })
		}
		responseHandler(res, 200, {
			message: 'Project updated successfully',
			data: project,
		})
	})

	public deleteProject = asyncHandler(async (req: Request, res: Response) => {
		const deleted = await this.projectService.deleteProject(
			parseInt(req.params.id as string, 10)
		)
		if (!deleted) {
			return responseHandler(res, 404, { message: 'Project not found' })
		}
		responseHandler(res, 200, { message: 'Project deleted successfully' })
	})

	public getProjectAssignments = asyncHandler(
		async (req: Request, res: Response) => {
			const projectId = parseInt(req.params.id as string, 10)
			const isActive =
				req.query.isActive !== undefined
					? req.query.isActive === 'true'
					: undefined

			const assignments =
				await this.projectResourceAssignmentService.getProjectAssignments(
					projectId,
					{ isActive }
				)

			responseHandler(res, 200, {
				message: 'Project assignments retrieved successfully',
				data: assignments,
			})
		}
	)

	public assignResource = asyncHandler(
		async (req: Request, res: Response) => {
			const projectId = parseInt(req.params.id as string, 10)

			const assignment = await this.projectResourceAssignmentService.assignResource(
				projectId,
				req.body
			)

			responseHandler(res, 201, {
				message: 'Resource assigned to project successfully',
				data: assignment,
			})
		}
	)

	public removeResource = asyncHandler(
		async (req: Request, res: Response) => {
			const projectId = parseInt(req.params.id as string, 10)
			const assignmentId = parseInt(req.params.assignmentId as string, 10)

			const removed = await this.projectResourceAssignmentService.removeResource(
				projectId,
				assignmentId
			)

			if (!removed) {
				return responseHandler(res, 404, {
					message: 'Assignment not found',
				})
			}

			responseHandler(res, 200, { message: 'User removed from project.' })
		}
	)
}
