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
import { User } from './User'
import { Project } from './Project'
import { TimesheetPeriod } from './TimesheetPeriod'

export class TimesheetEntry extends Model<
	InferAttributes<TimesheetEntry>,
	InferCreationAttributes<TimesheetEntry>
> {
	declare id: CreationOptional<number>
	declare userId: number
	declare projectId: number
	declare timesheetPeriodId: number
	declare entryDate: string
	// Sequelize returns DECIMAL columns as strings by default; kept as
	// `string` here to reflect that faithfully (parse in the service layer
	// that validates it against project.maxDailyHours, also `string`).
	declare hours: string
	declare description: string
	declare isApproved: CreationOptional<boolean>
	declare approvedBy: CreationOptional<number | null>
	declare approvedAt: CreationOptional<Date | null>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	declare user?: NonAttribute<User>
	declare project?: NonAttribute<Project>
	declare timesheetPeriod?: NonAttribute<TimesheetPeriod>
	declare approvedByUser?: NonAttribute<User>

	// Note: the migration also adds `active_entry_marker`, a MySQL generated
	// STORED column that exists purely to back a DB-level unique index (no
	// duplicate entry for the same user + project + date among non-deleted
	// rows). It is DB-managed, never read or written by the app, and
	// intentionally has no attribute here.

	// Define searchable fields
	static searchableFields: string[] = []

	static associate(models: {
		User: ModelStatic<User>
		Project: ModelStatic<Project>
		TimesheetPeriod: ModelStatic<TimesheetPeriod>
	}) {
		TimesheetEntry.belongsTo(models.User, {
			foreignKey: 'userId',
			as: 'user',
		})
		TimesheetEntry.belongsTo(models.Project, {
			foreignKey: 'projectId',
			as: 'project',
		})
		TimesheetEntry.belongsTo(models.TimesheetPeriod, {
			foreignKey: 'timesheetPeriodId',
			as: 'timesheetPeriod',
		})
		TimesheetEntry.belongsTo(models.User, {
			foreignKey: 'approvedBy',
			as: 'approvedByUser',
		})
	}
}

export function initTimesheetEntry(sequelize: Sequelize): typeof TimesheetEntry {
	TimesheetEntry.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'user_id',
			},
			projectId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'project_id',
			},
			timesheetPeriodId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'timesheet_period_id',
			},
			entryDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'entry_date',
			},
			hours: {
				type: DataTypes.DECIMAL(4, 2),
				allowNull: false,
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			isApproved: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
				field: 'is_approved',
			},
			approvedBy: {
				type: DataTypes.INTEGER,
				allowNull: true,
				field: 'approved_by',
			},
			approvedAt: {
				type: DataTypes.DATE,
				allowNull: true,
				field: 'approved_at',
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
			modelName: 'TimesheetEntry',
			tableName: 'timesheet_entries',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return TimesheetEntry
}

export type TimesheetEntryModel = ModelStatic<TimesheetEntry>
