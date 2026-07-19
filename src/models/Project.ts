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

export class Project extends Model<
	InferAttributes<Project>,
	InferCreationAttributes<Project>
> {
	declare id: CreationOptional<number>
	declare code: string
	declare name: string
	declare description: CreationOptional<string | null>
	declare clientName: CreationOptional<string | null>
	declare clientEmail: CreationOptional<string | null>
	declare startDate: string
	declare endDate: CreationOptional<string | null>
	declare maxDailyHours: CreationOptional<string>
	declare isActive: CreationOptional<boolean>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	// Define searchable fields
	static searchableFields = ['code', 'name']
}

export function initProject(sequelize: Sequelize): typeof Project {
	Project.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			code: {
				type: DataTypes.STRING(50),
				allowNull: false,
				unique: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			clientName: {
				type: DataTypes.STRING,
				allowNull: true,
				field: 'client_name',
			},
			clientEmail: {
				type: DataTypes.STRING,
				allowNull: true,
				field: 'client_email',
			},
			startDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'start_date',
			},
			endDate: {
				type: DataTypes.DATEONLY,
				allowNull: true,
				field: 'end_date',
			},
			// Sequelize returns DECIMAL columns as strings by default; kept as
			// `string` here to reflect that faithfully (parse in the service
			// layer that consumes it, e.g. future TS-07 validation).
			maxDailyHours: {
				type: DataTypes.DECIMAL(4, 2),
				allowNull: false,
				defaultValue: 8.0,
				field: 'max_daily_hours',
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
			modelName: 'Project',
			tableName: 'projects',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return Project
}

export type ProjectModel = ModelStatic<Project>
