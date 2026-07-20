import z from 'zod'

const assignResourceSchema = z.object({
	userId: z
		.number()
		.int()
		.positive({ message: 'userId must be a positive integer' }),
	resourceRoleTypeId: z
		.number()
		.int()
		.positive({ message: 'resourceRoleTypeId must be a positive integer' }),
})

export { assignResourceSchema }
