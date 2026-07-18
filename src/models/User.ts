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
type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS]

export class User extends Model<
	InferAttributes<User>,
	InferCreationAttributes<User>
> {
	declare id: CreationOptional<number>
	declare name: string
	declare email: string
	declare password: string
	declare status: CreationOptional<UserStatus>
	declare roles?: NonAttribute<Role[]>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	// Define searchable fields
	static searchableFields = ['name', 'email']

	static associate(models: { Role: ModelStatic<Role> }) {
		User.belongsToMany(models.Role, {
			through: 'user_roles',
			foreignKey: 'userId',
			as: 'roles',
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
