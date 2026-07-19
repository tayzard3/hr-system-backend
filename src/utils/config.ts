import { throwErr } from './globalErrorHandler'

const env = (key: string) =>
	process.env[key] || throwErr(`ENV: ${key} is required`)

const optionalEnv = (key: string, defaultValue: string) =>
	process.env[key] ?? defaultValue

const parseBoolean = (value: boolean | string) => {
	if (typeof value === 'boolean') return value
	if (typeof value === 'string') {
		value = value.toLowerCase().trim()
		return value === 'true' || value === '1' || value === 'yes'
	}
	return false
}

const appConfig = {
	SERVER_HOST: env('SERVER_HOST'),
	SERVER_PORT: env('SERVER_PORT'),
	TIME_ZONE: optionalEnv('TIME_ZONE', 'Asia/Yangon'),
	JWT_SECRET: env('JWT_SECRET'),
	JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS: parseInt(
		optionalEnv('JWT_ACCESS_TOKEN_EXPIRES_IN_SECONDS', '900') // 15 minutes
	),
	JWT_REFRESH_TOKEN_EXPIRES_IN_SECONDS: parseInt(
		optionalEnv('JWT_REFRESH_TOKEN_EXPIRES_IN_SECONDS', '604800') // 7 days
	),
	DEFAULT_PAGINATE: env('DEFAULT_PAGINATE'),
	SENDGRID_ACCOUNT_EMAIL: env('SENDGRID_ACCOUNT_EMAIL'),
	SENDGRID_API_KEY: env('SENDGRID_API_KEY'),
	SENDGRID_ACCOUNT_NAME: env('SENDGRID_ACCOUNT_NAME'),
	SENDGRID_RETRY: env('SENDGRID_RETRY'),
	SENDGRID_FORGET_PASSWORD_TEMPLATE_ID: env(
		'SENDGRID_FORGET_PASSWORD_TEMPLATE_ID'
	),
	BCRYPTJS_SALT: optionalEnv('BCRYPTJS_SALT', '10'),
}
export default appConfig
