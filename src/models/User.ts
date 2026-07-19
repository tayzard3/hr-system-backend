'use strict'
import {
	DataTypes,
	Model,
	Sequelize,
	ModelStatic,
	BelongsToManyAddAssociationsMixin,
	NonAttribute,
	HasManySetAssociationsMixin,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
} from 'sequelize'
import { USER_STATUS } from '../constants'
import { Role } from './Role'
import { Country } from './Country'
type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

export class User extends Model<
	InferAttributes<User>,
	InferCreationAttributes<User>
> {
	declare id: CreationOptional<number>
	declare name: string
	declare username: CreationOptional<string | null>
	declare firstName: CreationOptional<string | null>
	declare lastName: CreationOptional<string | null>
	declare email: string
	declare password: string
	declare status: CreationOptional<UserStatus>
	declare countryId: CreationOptional<number | null>
	declare country?: NonAttribute<Country>
	declare roles?: NonAttribute<Role[]>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	// Define searchable fields
	static searchableFields = ['name', 'username', 'email']

	static associate(models: {
		Role: ModelStatic<Role>
		Country: ModelStatic<Country>
	}) {
		User.belongsToMany(models.Role, {
			through: 'user_roles',
			foreignKey: 'userId',
			as: 'roles',
		})
		User.belongsTo(models.Country, {
			foreignKey: 'countryId',
			as: 'country',
		})
	}

	declare addRoles: BelongsToManyAddAssociationsMixin<Role, number>
	declare setRoles: HasManySetAssociationsMixin<Role, number>
}

export function initUser(sequelize: Sequelize) {
	User.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				allowNull: false,
				autoIncrement: true,
			},
			name: {
				allowNull: false,
				type: DataTypes.STRING,
			},
			username: {
				allowNull: true,
				type: DataTypes.STRING(50),
				unique: true,
			},
			firstName: {
				allowNull: true,
				type: DataTypes.STRING,
				field: 'first_name',
			},
			lastName: {
				allowNull: true,
				type: DataTypes.STRING,
				field: 'last_name',
			},
			email: {
				allowNull: false,
				type: DataTypes.STRING,
				unique: true,
			},
			password: {
				type: DataTypes.STRING,
				field: 'password',
			},
			status: {
				type: DataTypes.STRING,
				defaultValue: USER_STATUS.ACTIVE,
			},
			countryId: {
				allowNull: true,
				type: DataTypes.INTEGER,
				field: 'country_id',
			},
			createdAt: {
				allowNull: false,
				type: DataTypes.DATE,
				field: 'created_at',
			},
			updatedAt: {
				allowNull: false,
				type: DataTypes.DATE,
				field: 'updated_at',
			},
			deletedAt: {
				allowNull: true,
				type: DataTypes.DATE,
				field: 'deleted_at',
			},
		},
		{
			sequelize,
			modelName: 'User',
			tableName: 'users',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)

	return User
}

export type UserModel = ModelStatic<User>
