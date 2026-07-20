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

export class TimesheetPeriod extends Model<
	InferAttributes<TimesheetPeriod>,
	InferCreationAttributes<TimesheetPeriod>
> {
	declare id: CreationOptional<number>
	declare startDate: string
	declare endDate: string
	declare year: number
	declare month: number
	declare isLocked: CreationOptional<boolean>
	declare lockedAt: CreationOptional<Date | null>
	declare lockedBy: CreationOptional<number | null>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	declare lockedByUser?: NonAttribute<User>

	// Define searchable fields
	static searchableFields: string[] = []

	static associate(models: { User: ModelStatic<User> }) {
		TimesheetPeriod.belongsTo(models.User, {
			foreignKey: 'lockedBy',
			as: 'lockedByUser',
		})
	}
}

export function initTimesheetPeriod(sequelize: Sequelize): typeof TimesheetPeriod {
	TimesheetPeriod.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			startDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'start_date',
			},
			endDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'end_date',
			},
			year: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			month: {
				type: DataTypes.INTEGER,
				allowNull: false,
			},
			isLocked: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
				field: 'is_locked',
			},
			lockedAt: {
				type: DataTypes.DATE,
				allowNull: true,
				field: 'locked_at',
			},
			lockedBy: {
				type: DataTypes.INTEGER,
				allowNull: true,
				field: 'locked_by',
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
			modelName: 'TimesheetPeriod',
			tableName: 'timesheet_periods',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return TimesheetPeriod
}

export type TimesheetPeriodModel = ModelStatic<TimesheetPeriod>
