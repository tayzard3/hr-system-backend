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
import { Invoice } from './Invoice'
import { User } from './User'
import { ResourceRoleType } from './ResourceRoleType'
import { TimesheetEntry } from './TimesheetEntry'

export class InvoiceLineItem extends Model<
	InferAttributes<InvoiceLineItem>,
	InferCreationAttributes<InvoiceLineItem>
> {
	declare id: CreationOptional<number>
	declare invoiceId: number
	declare userId: number
	declare resourceRoleTypeId: number
	// Unique at the DB level (see migration) — the durable guard against a
	// timesheet entry being billed on more than one invoice.
	declare timesheetEntryId: number
	// Snapshot of the source timesheet entry's task description at billing
	// time.
	declare description: string
	// Sequelize returns DECIMAL columns as strings by default; kept as
	// `string` here to reflect that faithfully (parse in the service layer
	// that consumes it).
	declare hours: string
	declare unitRate: string
	declare amount: string
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>

	declare invoice?: NonAttribute<Invoice>
	declare user?: NonAttribute<User>
	declare resourceRoleType?: NonAttribute<ResourceRoleType>
	declare timesheetEntry?: NonAttribute<TimesheetEntry>

	// Define searchable fields
	static searchableFields: string[] = []

	static associate(models: {
		Invoice: ModelStatic<Invoice>
		User: ModelStatic<User>
		ResourceRoleType: ModelStatic<ResourceRoleType>
		TimesheetEntry: ModelStatic<TimesheetEntry>
	}) {
		InvoiceLineItem.belongsTo(models.Invoice, {
			foreignKey: 'invoiceId',
			as: 'invoice',
		})
		InvoiceLineItem.belongsTo(models.User, {
			foreignKey: 'userId',
			as: 'user',
		})
		InvoiceLineItem.belongsTo(models.ResourceRoleType, {
			foreignKey: 'resourceRoleTypeId',
			as: 'resourceRoleType',
		})
		InvoiceLineItem.belongsTo(models.TimesheetEntry, {
			foreignKey: 'timesheetEntryId',
			as: 'timesheetEntry',
		})
	}
}

export function initInvoiceLineItem(sequelize: Sequelize): typeof InvoiceLineItem {
	InvoiceLineItem.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			invoiceId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'invoice_id',
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
			timesheetEntryId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'timesheet_entry_id',
			},
			description: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			hours: {
				type: DataTypes.DECIMAL(4, 2),
				allowNull: false,
			},
			unitRate: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: false,
				field: 'unit_rate',
			},
			amount: {
				type: DataTypes.DECIMAL(14, 2),
				allowNull: false,
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
			modelName: 'InvoiceLineItem',
			tableName: 'invoice_line_items',
			paranoid: false, // No independent soft-delete — owned entirely by its Invoice (see migration).
			timestamps: true,
			underscored: true,
		}
	)
	return InvoiceLineItem
}

export type InvoiceLineItemModel = ModelStatic<InvoiceLineItem>
