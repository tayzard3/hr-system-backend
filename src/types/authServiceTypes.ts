export interface tokenAttributes {
	userId: number
}

export interface signUpResponseType {
	userId: number
	accessToken: string
}

export interface signInResponseType {
	user: { name: string; email: string }
	accessToken: string
	refreshToken: string
	accessTokenExpiresAt: Date
	refreshTokenExpiresAt: Date
}

export interface refreshTokenResponseType {
	accessToken: string
	refreshToken: string
	accessTokenExpiresAt: Date
	refreshTokenExpiresAt: Date
}

export interface UpdateProfileDTO {
	firstName: string
	lastName: string
	email: string
	username: string
	/** Integer FK to `countries.id` (see User model) — nullable, matches column. */
	countryId?: number | null
}

export interface UpdateProfileCountry {
	id: number
	code: string
	name: string
}

export interface UpdateProfileResponseType {
	id: number
	fullName: string
	email: string
	username: string | null
	country: UpdateProfileCountry | null
}

export interface ChangePasswordDTO {
	currentPassword: string
	newPassword: string
	confirmNewPassword: string
}
