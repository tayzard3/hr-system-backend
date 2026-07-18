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
import { Role } from './Role'

export class Permission extends Model<
	InferAttributes<Permission>,
	InferCreationAttributes<Permission>
> {
	declare id: CreationOptional<number>
	declare name: string
	declare description: CreationOptional<string | null>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>

	// Define searchable fields
	static searchableFields = ['name']

	static associate(models: { Role: ModelStatic<Role> }): void {
		Permission.belongsToMany(models.Role, {
			through: 'role_permissions',
			foreignKey: 'permissionId',
			as: 'roles',
		})
	}

	declare addRoles: BelongsToManyAddAssociationsMixin<Role, number>
	declare setRoles: HasManySetAssociationsMixin<Role, number>
}

export function initPermission(sequelize: Sequelize): typeof Permission {
	Permission.init(
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
			modelName: 'Permission',
			tableName: 'permissions',
			timestamps: true,
			underscored: true,
		}
	)
	return Permission
}

export type PermissionModel = ModelStatic<Permission>
