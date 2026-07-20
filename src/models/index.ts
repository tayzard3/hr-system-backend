'use strict'

import { Sequelize } from 'sequelize'
import * as process from 'process'
import { development, test, production } from '../../config/'
import { NODE_ENV } from '../constants'

import { UserModel, initUser } from './User'
import { RoleModel, initRole } from './Role'
import { PermissionModel, initPermission } from './Permission'
import { RefreshTokenModel, initRefreshToken } from './RefreshToken'
import { CountryModel, initCountry } from './Country'
import { ProjectModel, initProject } from './Project'
import { ResourceRoleTypeModel, initResourceRoleType } from './ResourceRoleType'
import {
	ProjectResourceAssignmentModel,
	initProjectResourceAssignment,
} from './ProjectResourceAssignment'
import { TimesheetPeriodModel, initTimesheetPeriod } from './TimesheetPeriod'

const env = process.env.NODE_ENV || 'development'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = {}

export let sequelize: Sequelize

if (env === NODE_ENV.DEVELOPMENT) {
	sequelize = new Sequelize(
		development.database,
		development.username,
		development.password,
		development
	)
} else if (env === NODE_ENV.TEST) {
	sequelize = new Sequelize(test.database, test.username, test.password, test)
} else if (env === NODE_ENV.PRODUCTION) {
	sequelize = new Sequelize(
		production.database,
		production.username,
		production.password,
		{
			host: production.host,
			port: Number(process.env.PROD_DB_PORT) || 3306,
			dialect: 'mysql',
			logging: false,

			dialectOptions: {
				ssl: {
					rejectUnauthorized: false,
				},
			},

			pool: production.pool,
			retry: production.retry,
		}
	)
} else {
	throw new Error(`Unknown environment: ${env}`)
}

db.sequelize = sequelize
db.Sequelize = Sequelize

db.User = initUser(sequelize)
db.Role = initRole(sequelize)
db.Permission = initPermission(sequelize)
db.RefreshToken = initRefreshToken(sequelize)
db.Country = initCountry(sequelize)
db.Project = initProject(sequelize)
db.ResourceRoleType = initResourceRoleType(sequelize)
db.ProjectResourceAssignment = initProjectResourceAssignment(sequelize)
db.TimesheetPeriod = initTimesheetPeriod(sequelize)

Object.keys(db).forEach((modelName) => {
	if (db[modelName].associate) {
		db[modelName].associate(db)
	}
})

export const User = db.User as UserModel
export const Role = db.Role as RoleModel
export const Permission = db.Permission as PermissionModel
export const RefreshToken = db.RefreshToken as RefreshTokenModel
export const Country = db.Country as CountryModel
export const Project = db.Project as ProjectModel
export const ResourceRoleType = db.ResourceRoleType as ResourceRoleTypeModel
export const ProjectResourceAssignment =
	db.ProjectResourceAssignment as ProjectResourceAssignmentModel
export const TimesheetPeriod = db.TimesheetPeriod as TimesheetPeriodModel

export default db
