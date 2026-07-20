'use strict'
import {
	Model,
	DataTypes,
	ModelStatic,
	Sequelize,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	NonAttribute,
} from 'sequelize'
import { Project } from './Project'
import { User } from './User'
import { ResourceRoleType } from './ResourceRoleType'

export class ProjectResourceAssignment extends Model<
	InferAttributes<ProjectResourceAssignment>,
	InferCreationAttributes<ProjectResourceAssignment>
> {
	declare id: CreationOptional<number>
	declare projectId: number
	declare userId: number
	declare resourceRoleTypeId: number
	declare assignedAt: CreationOptional<Date>
	declare isActive: CreationOptional<boolean>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	declare project?: NonAttribute<Project>
	declare user?: NonAttribute<User>
	declare resourceRoleType?: NonAttribute<ResourceRoleType>

	// Note: the migration also adds `active_assignment_marker`, a MySQL
	// generated STORED column that exists purely to back a DB-level unique
	// index (one active assignment per user per project). It is DB-managed,
	// never read or written by the app, and intentionally has no attribute
	// here.

	static associate(models: {
		Project: ModelStatic<Project>
		User: ModelStatic<User>
		ResourceRoleType: ModelStatic<ResourceRoleType>
	}) {
		ProjectResourceAssignment.belongsTo(models.Project, {
			foreignKey: 'projectId',
			as: 'project',
		})
		ProjectResourceAssignment.belongsTo(models.User, {
			foreignKey: 'userId',
			as: 'user',
		})
		ProjectResourceAssignment.belongsTo(models.ResourceRoleType, {
			foreignKey: 'resourceRoleTypeId',
			as: 'resourceRoleType',
		})
	}
}

export function initProjectResourceAssignment(
	sequelize: Sequelize
): typeof ProjectResourceAssignment {
	ProjectResourceAssignment.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			projectId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'project_id',
			},
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'user_id',
			},
			resourceRoleTypeId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'resource_role_type_id',
			},
			assignedAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
				field: 'assigned_at',
			},
			isActive: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: true,
				field: 'is_active',
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
			modelName: 'ProjectResourceAssignment',
			tableName: 'project_resource_assignments',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return ProjectResourceAssignment
}

export type ProjectResourceAssignmentModel = ModelStatic<ProjectResourceAssignment>
