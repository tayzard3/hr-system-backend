require('dotenv').config()

const development = {
	username: process.env.DEV_DB_USERNAME,
	password: process.env.DEV_DB_PASSWORD,
	database: process.env.DEV_DB_DATABASE,
	host: process.env.DEV_DB_HOST,
	dialect: process.env.DEV_DB_CONNECTION,
	logging: process.env.DB_LOGGING === 'true',
	timezone: '+06:30',
	pool: {
		max: Number(process.env.DEV_DB_POOL_SIZE) || 5,
	},
	retry: {
		match: [/Deadlock/i],
		max: 10,
		backoffBase: 1000,
		backoffExponent: 1.5,
	},
	define: {
		modelOptions: {
			define: false,
		},
	},
	seederStorage: 'sequelize',
}

const test = {
	username: process.env.TEST_DB_USERNAME,
	password: process.env.TEST_DB_PASSWORD,
	database: process.env.TEST_DB_DATABASE,
	host: process.env.TEST_DB_HOST,
	dialect: process.env.TEST_DB_CONNECTION,
	logging: process.env.DB_LOGGING === 'true',
	timezone: '+06:30',
	pool: {
		max: Number(process.env.TEST_DB_POOL_SIZE) || 5,
	},
	retry: {
		match: [/Deadlock/i],
		max: 10,
		backoffBase: 1000,
		backoffExponent: 1.5,
	},
	seederStorage: 'sequelize',
}

const production = {
	username: process.env.PROD_DB_USERNAME,
	password: process.env.PROD_DB_PASSWORD,
	database: process.env.PROD_DB_DATABASE,
	host: process.env.PROD_DB_HOST,
	port: Number(process.env.PROD_DB_PORT) || 3306,
	dialect: 'mysql',

	logging: false,

	dialectOptions: {
		ssl: {
			rejectUnauthorized: false,
		},
	},

	pool: {
		max: Number(process.env.PROD_DB_POOL_SIZE) || 5,
		min: 0,
		acquire: 60000,
		idle: 10000,
	},

	retry: {
		max: 10,
	},
}

module.exports = {
	development,
	test,
	production,
}
