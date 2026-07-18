'use strict'

Object.defineProperty(exports, '__esModule', {
	value: true,
})
exports.test = exports.production = exports.development = void 0
var dialect = process.env.DEV_DB_CONNECTION || 'mysql'
var development = (exports.development = {
	username: process.env.DEV_DB_USERNAME || '',
	password: process.env.DEV_DB_PASSWORD || '',
	database: process.env.DEV_DB_DATABASE || '',
	host: process.env.DEV_DB_HOST || '',
	dialect: dialect,
	logging: process.env.DB_LOGGING === 'true' ? true : false,
	timezone: '+06:30',
	pool: {
		max: isNaN(Number(process.env.DEV_DB_POOL_SIZE))
			? 5 // Fallback value
			: Number(process.env.DEV_DB_POOL_SIZE),
	},
	retry: {
		match: [/Deadlock/i],
		max: 10,
		// Maximum retry 10 times
		backoffBase: 1000,
		// Initial backoff duration in ms. Default: 100,
		backoffExponent: 1.5, // Exponent to increase backoff each try. Default: 1.1
	},
})
var test = (exports.test = {
	username: process.env.TEST_DB_USERNAME || '',
	password: process.env.TEST_DB_PASSWORD || '',
	database: process.env.TEST_DB_DATABASE || '',
	host: process.env.TEST_DB_HOST || '',
	dialect: dialect,
	logging: process.env.DB_LOGGING === 'true' ? true : false,
	timezone: '+06:30',
	pool: {
		max: isNaN(Number(process.env.DEV_DB_POOL_SIZE))
			? 5 // Fallback value
			: Number(process.env.DEV_DB_POOL_SIZE),
	},
	retry: {
		match: [/Deadlock/i],
		max: 10,
		// Maximum retry 10 times
		backoffBase: 1000,
		// Initial backoff duration in ms. Default: 100,
		backoffExponent: 1.5, // Exponent to increase backoff each try. Default: 1.1
	},
})
var production = (exports.production = {
	username: process.env.PROD_DB_USERNAME || '',
	password: process.env.PROD_DB_PASSWORD || '',
	database: process.env.PROD_DB_DATABASE || '',
	host: process.env.PROD_DB_HOST || '',
	dialect: dialect,
	logging: process.env.DB_LOGGING === 'true' ? true : false,
	timezone: '+06:30',
	pool: {
		max: isNaN(Number(process.env.DEV_DB_POOL_SIZE))
			? 5 // Fallback value
			: Number(process.env.DEV_DB_POOL_SIZE),
	},
	retry: {
		match: [/Deadlock/i],
		max: 10,
		// Maximum retry 10 times
		backoffBase: 1000,
		// Initial backoff duration in ms. Default: 100,
		backoffExponent: 1.5, // Exponent to increase backoff each try. Default: 1.1
	},
})
//# sourceMappingURL=index.js.map
