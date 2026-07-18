class AppException extends Error {
	statusCode: number
	errorMessage: string
	errorValidations?: object

	constructor(message: string, statusCode: number, errorValidations?: object) {
		super(message)

		// Manually set the prototype for proper inheritance
		Object.setPrototypeOf(this, new.target.prototype)

		this.name = this.constructor.name // Set the name property to 'AppException'
		this.statusCode = statusCode
		this.errorMessage = message
		this.errorValidations = errorValidations

		// Capture the stack trace (optional, useful for debugging)
		Error.captureStackTrace(this, this.constructor)
	}
}

export default AppException
