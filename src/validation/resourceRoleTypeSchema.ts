import z from 'zod'

const createResourceRoleTypeSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, { message: 'name is required' })
		.max(255, { message: 'name cannot exceed 255 characters' }),
	description: z.string().trim().max(65535).optional().nullable(),
})

const updateResourceRoleTypeSchema = createResourceRoleTypeSchema.partial()

export { createResourceRoleTypeSchema, updateResourceRoleTypeSchema }
