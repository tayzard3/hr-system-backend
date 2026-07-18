import z from 'zod'

const signUpSchema = z.object({
	name: z.string(),
	email: z.string().email({ message: 'Invalid email format' }),
	password: z
		.string()
		.min(9, { message: 'Password must be at least 9 characters long' })
		.max(14, { message: 'Password cannot exceed 14 characters' })
		.regex(/[a-zA-Z]/, {
			message: 'Password must include at least one letter',
		})
		.regex(/\d/, { message: 'Password must include at least one number' }),
})

const signInSchema = z.object({
	email: z.string(),
	password: z.string(),
})

const forgetPasswordSchema = z.object({
	email: z.string(),
	redirectTo: z.string(),
})

const resetPasswordSchema = z.object({
	password: z.string(),
})

const updateUserRoleSchema = z.object({
	roles: z.array(z.number()),
})

const updateUserSchema = z.object({
	name: z.string(),
	email: z.string().email({ message: 'Invalid email format' }),
	roles: z.array(z.number()),
})

export {
	signUpSchema,
	signInSchema,
	forgetPasswordSchema,
	resetPasswordSchema,
	updateUserRoleSchema,
	updateUserSchema,
}
