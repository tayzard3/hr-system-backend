'use strict'
import {
	Model,
	DataTypes,
	ModelStatic,
	Sequelize,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	BelongsToManyAddAssociationsMixin,
	HasManySetAssociationsMixin,
} from 'sequelize'
import { User } from './User'
import { Permission } from './Permission'

export class Role extends Model<
	InferAttributes<Role>,
	InferCreationAttributes<Role>
> {
	declare id: CreationOptional<number>
	declare name: string
	declare description: CreationOptional<string | null>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>

	// Define searchable fields
	static searchableFields = ['name']

	static associate(models: {
		User: ModelStatic<User>
		Permission: ModelStatic<Permission>
	}): void {
		Role.belongsToMany(models.User, {
			through: 'user_roles',
			foreignKey: 'roleId',
			as: 'users',
		})

		Role.belongsToMany(models.Permission, {
			through: 'role_permissions',
			foreignKey: 'roleId',
			as: 'permissions',
		})
	}

	declare addPermissions: BelongsToManyAddAssociationsMixin<
		Permission,
		number
	>
	declare setPermissions: HasManySetAssociationsMixin<Permission, number>
}

export function initRole(sequelize: Sequelize): typeof Role {
	Role.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			description: {
				type: DataTypes.STRING,
				allowNull: true,
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
		},
		{
			sequelize,
			modelName: 'Role',
			tableName: 'roles',
			timestamps: true,
			underscored: true,
		}
	)
	return Role
}

export type RoleModel = ModelStatic<Role>
