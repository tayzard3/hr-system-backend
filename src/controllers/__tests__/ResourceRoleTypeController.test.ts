import express, { Application } from 'express'
import request from 'supertest'
import { ResourceRoleTypeController } from '../ResourceRoleTypeController'
import { IResourceRoleTypeService } from '../../interfaces/service/IResourceRoleTypeService'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createResourceRoleTypeSchema,
	updateResourceRoleTypeSchema,
} from '../../validation/resourceRoleTypeSchema'
import AppException from '../../exceptions/AppException'
import { globalErrorHandler } from '../../utils/globalErrorHandler'

// HTTP-level tests wired the same way resourceRoleTypeRoutes.ts wires the
// real routes (validation middleware -> controller -> asyncHandler ->
// globalErrorHandler), but with a mocked IResourceRoleTypeService so no DI
// container / real DB is involved (mirrors CountryController.test.ts /
// ProjectController.test.ts).
describe('ResourceRoleTypeController', () => {
	let resourceRoleTypeServiceMock: jest.Mocked<IResourceRoleTypeService>
	let app: Application

	const seniorDeveloper = {
		id: 1,
		name: 'Senior Developer',
		description: 'Senior-level engineering resource',
	}

	beforeEach(() => {
		resourceRoleTypeServiceMock = {
			getAllResourceRoleTypes: jest.fn(),
			createResourceRoleType: jest.fn(),
			getResourceRoleTypeById: jest.fn(),
			updateResourceRoleType: jest.fn(),
			deleteResourceRoleType: jest.fn(),
		} as unknown as jest.Mocked<IResourceRoleTypeService>

		const resourceRoleTypeController = new ResourceRoleTypeController(
			resourceRoleTypeServiceMock
		)

		app = express()
		app.use(express.json())
		app
			.route('/resource-role-types')
			.get(resourceRoleTypeController.getAllResourceRoleTypes)
			.post(
				zodSchemaValidator(createResourceRoleTypeSchema),
				resourceRoleTypeController.createResourceRoleType
			)
		app
			.route('/resource-role-types/:id')
			.get(resourceRoleTypeController.getResourceRoleTypeById)
			.put(
				zodSchemaValidator(updateResourceRoleTypeSchema),
				resourceRoleTypeController.updateResourceRoleType
			)
			.delete(resourceRoleTypeController.deleteResourceRoleType)
		app.use(globalErrorHandler)
	})

	describe('GET /resource-role-types', () => {
		it('returns the list of resource role types', async () => {
			resourceRoleTypeServiceMock.getAllResourceRoleTypes.mockResolvedValue([
				seniorDeveloper,
			] as never)

			const res = await request(app).get('/resource-role-types')

			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
			expect(res.body.data).toEqual([seniorDeveloper])
		})

		it('forwards page/perPage/keyword query params to the service', async () => {
			resourceRoleTypeServiceMock.getAllResourceRoleTypes.mockResolvedValue(
				[] as never
			)

			await request(app).get(
				'/resource-role-types?page=2&perPage=5&keyword=Senior'
			)

			expect(
				resourceRoleTypeServiceMock.getAllResourceRoleTypes
			).toHaveBeenCalledWith(
				expect.objectContaining({ page: 2, perPage: 5, keyword: 'Senior' })
			)
		})
	})

	describe('POST /resource-role-types', () => {
		it('returns 422 when name is missing', async () => {
			const res = await request(app)
				.post('/resource-role-types')
				.send({ description: 'No name' })

			expect(res.body.statusCode).toBe(422)
			expect(
				resourceRoleTypeServiceMock.createResourceRoleType
			).not.toHaveBeenCalled()
		})

		it('creates the resource role type and returns 201 on success', async () => {
			resourceRoleTypeServiceMock.createResourceRoleType.mockResolvedValue(
				seniorDeveloper as never
			)

			const res = await request(app).post('/resource-role-types').send({
				name: 'Senior Developer',
				description: 'Senior-level engineering resource',
			})

			expect(
				resourceRoleTypeServiceMock.createResourceRoleType
			).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'Senior Developer' })
			)
			expect(res.body.statusCode).toBe(201)
			expect(res.body.data).toEqual(seniorDeveloper)
		})

		it('propagates a domain AppException (e.g. duplicate name) through the central error handler', async () => {
			resourceRoleTypeServiceMock.createResourceRoleType.mockRejectedValue(
				new AppException(
					'Resource role type with this name already exists',
					409
				)
			)

			const res = await request(app)
				.post('/resource-role-types')
				.send({ name: 'Senior Developer' })

			expect(res.body.statusCode).toBe(409)
			expect(res.body.isSuccess).toBe(false)
			expect(res.body.message).toBe(
				'Resource role type with this name already exists'
			)
		})
	})

	describe('GET /resource-role-types/:id', () => {
		it('returns the resource role type when found', async () => {
			resourceRoleTypeServiceMock.getResourceRoleTypeById.mockResolvedValue(
				seniorDeveloper as never
			)

			const res = await request(app).get('/resource-role-types/1')

			expect(
				resourceRoleTypeServiceMock.getResourceRoleTypeById
			).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(seniorDeveloper)
		})

		it('maps a not-found domain error to 404 via the central error handler', async () => {
			resourceRoleTypeServiceMock.getResourceRoleTypeById.mockRejectedValue(
				new AppException('Resource role type not found', 404)
			)

			const res = await request(app).get('/resource-role-types/999')

			expect(res.body.statusCode).toBe(404)
			expect(res.body.isSuccess).toBe(false)
		})
	})

	describe('PUT /resource-role-types/:id', () => {
		it('returns 422 when name exceeds the max length', async () => {
			const res = await request(app)
				.put('/resource-role-types/1')
				.send({ name: 'a'.repeat(256) })

			expect(res.body.statusCode).toBe(422)
			expect(
				resourceRoleTypeServiceMock.updateResourceRoleType
			).not.toHaveBeenCalled()
		})

		it('returns 404 when the service reports the resource role type was not found', async () => {
			resourceRoleTypeServiceMock.updateResourceRoleType.mockResolvedValue(
				null
			)

			const res = await request(app)
				.put('/resource-role-types/999')
				.send({ name: 'New Name' })

			expect(res.body.statusCode).toBe(404)
		})

		it('updates the resource role type and returns 200 on success', async () => {
			const updated = { ...seniorDeveloper, name: 'Lead Developer' }
			resourceRoleTypeServiceMock.updateResourceRoleType.mockResolvedValue(
				updated as never
			)

			const res = await request(app)
				.put('/resource-role-types/1')
				.send({ name: 'Lead Developer' })

			expect(
				resourceRoleTypeServiceMock.updateResourceRoleType
			).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ name: 'Lead Developer' })
			)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.data).toEqual(updated)
		})
	})

	describe('DELETE /resource-role-types/:id', () => {
		it('returns 404 when the resource role type does not exist', async () => {
			resourceRoleTypeServiceMock.deleteResourceRoleType.mockResolvedValue(
				false
			)

			const res = await request(app).delete('/resource-role-types/999')

			expect(res.body.statusCode).toBe(404)
		})

		it('deletes the resource role type and returns 200 on success', async () => {
			resourceRoleTypeServiceMock.deleteResourceRoleType.mockResolvedValue(
				true
			)

			const res = await request(app).delete('/resource-role-types/1')

			expect(
				resourceRoleTypeServiceMock.deleteResourceRoleType
			).toHaveBeenCalledWith(1)
			expect(res.body.statusCode).toBe(200)
			expect(res.body.isSuccess).toBe(true)
		})
	})
})
