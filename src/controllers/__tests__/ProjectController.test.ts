import express, { Application } from 'express'
import request from 'supertest'
import { ProjectController } from '../ProjectController'
import { IProjectService } from '../../interfaces/service/IProjectService'
import { IProjectResourceAssignmentService } from '../../interfaces/service/IProjectResourceAssignmentService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createProjectSchema,
	updateProjectSchema,
} from '../../validation/projectSchema'
import { assignResourceSchema } from '../../validation/projectResourceAssignmentSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way projectRoutes.ts wires the real routes
// (validation middleware -> controller -> asyncHandler -> globalErrorHandler),
// but with a mocked IProjectService so no DI container / real DB is involved
// (mirrors CountryController.test.ts).
describe('ProjectController', () => {
	let projectServiceMock: jest.Mocked<IProjectService>
	let projectResourceAssignmentServiceMock: jest.Mocked<IProjectResourceAssignmentService>
	let app: Application

	const project = {
		id: 1,
		code: 'PRJ-1',
		name: 'Project One',
		description: null,
		clientName: null,
		clientEmail: null,
		startDate: '2026-01-01',
		endDate: null,
		maxDailyHours: 8,
		isActive: true,
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:00:00.000Z'),
	}

	// `res.body` is JSON, so Date fields round-trip as ISO strings even though
	// the mocked service returns real `Date` objects — compare against that.
	const serialized = <T>(value: T): T => JSON.parse(JSON.stringify(value))

	beforeEach(() => {
		projectServiceMock = {
			getAllProjects: jest.fn(),
			createProject: jest.fn(),
			getProjectById: jest.fn(),
			updateProject: jest.fn(),
			deleteProject: jest.fn(),
		} as unknown as jest.Mocked<IProjectService>

		projectResourceAssignmentServiceMock = {
			getProjectAssignments: jest.fn(),
			assignResource: jest.fn(),
			removeResource: jest.fn(),
		} as unknown as jest.Mocked<IProjectResourceAssignmentService>

		const projectController = new ProjectController(
			projectServiceMock,
			projectResourceAssignmentServiceMock
		)

		app = express()
		app.use(express.json())
		app
			.route('/projects')
			.get(projectController.getAllProjects)
			.post(
				zodSchemaValidator(createProjectSchema),
				projectController.createProject
			)
		app
			.route('/projects/:id')
			.get(projectController.getProjectById)
			.put(
				zodSchemaValidator(updateProjectSchema),
				projectController.updateProject
			)
			.delete(projectController.deleteProject)
		app
			.route('/projects/:id/assignments')
			.get(projectController.getProjectAssignments)
			.post(
				zodSchemaValidator(assignResourceSchema),
				projectController.assignResource
			)
		app
			.route('/projects/:id/assignments/:assignmentId')
			.delete(projectController.removeResource)
		app.use(globalErrorHandler)
	})

	describe('GET /projects', () => {
		it('returns the list of projects', async () => {
			projectServiceMock.getAllProjects.mockResolvedValue([project] as never)

			const res = await request(app).get('/projects')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data).toEqual([serialized(project)])
		})

		it('forwards page/perPage/keyword/isActive/clientName query params to the service', async () => {
			projectServiceMock.getAllProjects.mockResolvedValue([] as never)

			await request(app).get(
				'/projects?page=2&perPage=5&keyword=abc&isActive=true&clientName=Acme'
			)

			expect(projectServiceMock.getAllProjects).toHaveBeenCalledWith(
				expect.objectContaining({
					page: 2,
					perPage: 5,
					keyword: 'abc',
					isActive: true,
					clientName: 'Acme',
				})
			)
		})
	})

	describe('POST /projects', () => {
		it('returns 422 when code is missing', async () => {
			const res = await request(app)
				.post('/projects')
				.send({ name: 'Project One', startDate: '2026-01-01' })

			expect(res.body.statusCode).toBe(422)
			expect(projectServiceMock.createProject).not.toHaveBeenCalled()
		})

		it('returns 422 when startDate is not in YYYY-MM-DD format', async () => {
			const res = await request(app).post('/projects').send({
				code: 'PRJ-1',
				name: 'Project One',
				startDate: '01/01/2026',
			})

			expect(res.body.statusCode).toBe(422)
			expect(projectServiceMock.createProject).not.toHaveBeenCalled()
		})

		it('returns 422 when clientEmail is not a valid email', async () => {
			const res = await request(app).post('/projects').send({
				code: 'PRJ-1',
				name: 'Project One',
				startDate: '2026-01-01',
				clientEmail: 'not-an-email',
			})

			expect(res.body.statusCode).toBe(422)
			expect(projectServiceMock.createProject).not.toHaveBeenCalled()
		})

		it('returns 422 when maxDailyHours exceeds 24', async () => {
			const res = await request(app).post('/projects').send({
				code: 'PRJ-1',
				name: 'Project One',
				startDate: '2026-01-01',
				maxDailyHours: 25,
			})

			expect(res.body.statusCode).toBe(422)
			expect(projectServiceMock.createProject).not.toHaveBeenCalled()
		})

		it('creates the project and returns 201 on success', async () => {
			projectServiceMock.createProject.mockResolvedValue(project as never)

			const res = await request(app).post('/projects').send({
				code: 'PRJ-1',
				name: 'Project One',
				startDate: '2026-01-01',
			})

			expect(projectServiceMock.createProject).toHaveBeenCalledWith(
				expect.objectContaining({ code: 'PRJ-1', name: 'Project One' })
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(serialized(project))
		})

		it('propagates a domain AppException (e.g. duplicate code) through the central error handler', async () => {
			projectServiceMock.createProject.mockRejectedValue(
				new AppException('Project with this code already exists', 409)
			)

			const res = await request(app).post('/projects').send({
				code: 'PRJ-1',
				name: 'Project One',
				startDate: '2026-01-01',
			})

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
			expect(res.body.message).toBe('Project with this code already exists')
		})
	})

	describe('GET /projects/:id', () => {
		it('returns the project when found', async () => {
			projectServiceMock.getProjectById.mockResolvedValue(project as never)

			const res = await request(app).get('/projects/1')

			expect(projectServiceMock.getProjectById).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(serialized(project))
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			projectServiceMock.getProjectById.mockRejectedValue(
				new AppException('Project not found', 404)
			)

			const res = await request(app).get('/projects/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /projects/:id', () => {
		it('returns 422 on an invalid partial payload', async () => {
			const res = await request(app)
				.put('/projects/1')
				.send({ clientEmail: 'not-an-email' })

			expect(res.body.statusCode).toBe(422)
			expect(projectServiceMock.updateProject).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the project was not found', async () => {
			projectServiceMock.updateProject.mockResolvedValue(null)

			const res = await request(app)
				.put('/projects/999')
				.send({ name: 'New Name' })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the project and returns 200 on success', async () => {
			const updated = { ...project, name: 'Renamed' }
			projectServiceMock.updateProject.mockResolvedValue(updated as never)

			const res = await request(app)
				.put('/projects/1')
				.send({ name: 'Renamed' })

			expect(projectServiceMock.updateProject).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ name: 'Renamed' })
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(serialized(updated))
		})
	})

	describe('DELETE /projects/:id', () => {
		it('returns 404 when the project does not exist', async () => {
			projectServiceMock.deleteProject.mockResolvedValue(false)

			const res = await request(app).delete('/projects/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the project and returns 200 on success', async () => {
			projectServiceMock.deleteProject.mockResolvedValue(true)

			const res = await request(app).delete('/projects/1')

			expect(projectServiceMock.deleteProject).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
		})
	})

	describe('GET /projects/:id/assignments', () => {
		const listItem = {
			id: 1,
			user: { id: 2, fullName: 'Jane Smith', email: 'jane@example.com' },
			resourceRoleType: { id: 3, name: 'Senior Developer' },
			assignedAt: new Date('2026-06-01T00:00:00.000Z'),
			isActive: true,
		}

		it('returns the list of assignments', async () => {
			projectResourceAssignmentServiceMock.getProjectAssignments.mockResolvedValue(
				[listItem] as never
			)

			const res = await request(app).get('/projects/1/assignments')

			expect(
				projectResourceAssignmentServiceMock.getProjectAssignments
			).toHaveBeenCalledWith(1, { isActive: undefined })
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual([serialized(listItem)])
		})

		it('forwards the isActive query param to the service', async () => {
			projectResourceAssignmentServiceMock.getProjectAssignments.mockResolvedValue(
				[] as never
			)

			await request(app).get('/projects/1/assignments?isActive=false')

			expect(
				projectResourceAssignmentServiceMock.getProjectAssignments
			).toHaveBeenCalledWith(1, { isActive: false })
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			projectResourceAssignmentServiceMock.getProjectAssignments.mockRejectedValue(
				new AppException('Project not found', 404)
			)

			const res = await request(app).get('/projects/999/assignments')

			expect(res.body.statusCode).toBe(404)
		})
	})

	describe('POST /projects/:id/assignments', () => {
		const assignment = {
			id: 1,
			projectId: 1,
			userId: 2,
			resourceRoleTypeId: 3,
			assignedAt: new Date('2026-06-15T10:00:00.000Z'),
			isActive: true,
		}

		it('returns 422 when userId is missing', async () => {
			const res = await request(app)
				.post('/projects/1/assignments')
				.send({ resourceRoleTypeId: 3 })

			expect(res.body.statusCode).toBe(422)
			expect(
				projectResourceAssignmentServiceMock.assignResource
			).not.toHaveBeenCalled()
		})

		it('assigns the resource and returns 201 on success', async () => {
			projectResourceAssignmentServiceMock.assignResource.mockResolvedValue(
				assignment as never
			)

			const res = await request(app)
				.post('/projects/1/assignments')
				.send({ userId: 2, resourceRoleTypeId: 3 })

			expect(
				projectResourceAssignmentServiceMock.assignResource
			).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ userId: 2, resourceRoleTypeId: 3 })
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(serialized(assignment))
		})

		it('propagates a domain AppException (e.g. duplicate assignment) through the central error handler', async () => {
			projectResourceAssignmentServiceMock.assignResource.mockRejectedValue(
				new AppException('User is already assigned to this project', 409)
			)

			const res = await request(app)
				.post('/projects/1/assignments')
				.send({ userId: 2, resourceRoleTypeId: 3 })

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('DELETE /projects/:id/assignments/:assignmentId', () => {
		it('returns 404 when the assignment does not exist', async () => {
			projectResourceAssignmentServiceMock.removeResource.mockResolvedValue(
				false
			)

			const res = await request(app).delete('/projects/1/assignments/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('removes the assignment and returns 200 on success', async () => {
			projectResourceAssignmentServiceMock.removeResource.mockResolvedValue(
				true
			)

			const res = await request(app).delete('/projects/1/assignments/1')

			expect(
				projectResourceAssignmentServiceMock.removeResource
			).toHaveBeenCalledWith(1, 1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.message).toBe('User removed from project.')
		})
	})
})
