import z from 'zod'

// Shared password strength rule (min/max length + letter + number) — reused
// wherever a new plaintext password is accepted (sign-up, change-password).
const passwordSchema = z
	.string()
	.min(9, { message: 'Password must be at least 9 characters long' })
	.max(14, { message: 'Password cannot exceed 14 characters' })
	.regex(/[a-zA-Z]/, {
		message: 'Password must include at least one letter',
	})
	.regex(/\d/, { message: 'Password must include at least one number' })

const signUpSchema = z.object({
	name: z.string(),
	email: z.string().email({ message: 'Invalid email format' }),
	password: passwordSchema,
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

// Cross-field match between `newPassword`/`confirmNewPassword` is intentionally
// NOT enforced here: the API spec calls for a `400` on mismatch, but
// `zodSchemaValidator` always responds `422` for schema failures, so that check
// is done in `AuthService.changePassword` instead where it can throw the
// `400 AppException` the spec requires. This schema only validates shape/strength.
const changePasswordSchema = z.object({
	currentPassword: z
		.string()
		.min(1, { message: 'currentPassword is required' }),
	newPassword: passwordSchema,
	confirmNewPassword: z
		.string()
		.min(1, { message: 'confirmNewPassword is required' }),
})

const refreshTokenSchema = z.object({
	refreshToken: z.string().min(1, { message: 'refreshToken is required' }),
})

const updateProfileSchema = z.object({
	firstName: z.string().min(1, { message: 'firstName is required' }),
	lastName: z.string().min(1, { message: 'lastName is required' }),
	email: z.string().email({ message: 'Invalid email format' }),
	username: z
		.string()
		.min(1, { message: 'username is required' })
		.max(50, { message: 'username cannot exceed 50 characters' }),
	// Integer FK to `countries.id` (see User model) — not a real UUID despite
	// the API spec sample showing "uuid"; nullable so a profile can clear its
	// country by sending `null`, optional so it can be omitted entirely.
	countryId: z.number().int().positive().nullable().optional(),
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
	refreshTokenSchema,
	updateUserRoleSchema,
	updateUserSchema,
	updateProfileSchema,
	changePasswordSchema,
}
