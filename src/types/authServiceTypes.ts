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
}
