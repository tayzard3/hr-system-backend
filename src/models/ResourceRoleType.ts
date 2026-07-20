'use strict'
import {
	Model,
	DataTypes,
	ModelStatic,
	Sequelize,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
} from 'sequelize'

export class ResourceRoleType extends Model<
	InferAttributes<ResourceRoleType>,
	InferCreationAttributes<ResourceRoleType>
> {
	declare id: CreationOptional<number>
	declare name: string
	declare description: CreationOptional<string | null>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	// Define searchable fields
	static searchableFields = ['name']
}

export function initResourceRoleType(sequelize: Sequelize): typeof ResourceRoleType {
	ResourceRoleType.init(
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
				type: DataTypes.TEXT,
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
			deletedAt: {
				allowNull: true,
				type: DataTypes.DATE,
				field: 'deleted_at',
			},
		},
		{
			sequelize,
			modelName: 'ResourceRoleType',
			tableName: 'resource_role_types',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return ResourceRoleType
}

export type ResourceRoleTypeModel = ModelStatic<ResourceRoleType>
