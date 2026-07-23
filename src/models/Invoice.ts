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
import { Currency } from './Currency'
import { InvoiceLineItem } from './InvoiceLineItem'

export const INVOICE_STATUS = {
	DRAFT: 'Draft',
	SENT: 'Sent',
	PAID: 'Paid',
	VOID: 'Void',
	CANCELLED: 'Cancelled',
} as const

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS]

export class Invoice extends Model<InferAttributes<Invoice>, InferCreationAttributes<Invoice>> {
	declare id: CreationOptional<number>
	declare invoiceNumber: string
	declare projectId: number
	// Snapshot of Project.clientName/clientEmail at generation time — Project
	// itself can change later, the invoice must not.
	declare clientName: string
	declare clientEmail: CreationOptional<string | null>
	declare billingPeriodStart: string
	declare billingPeriodEnd: string
	declare currencyId: number
	// Sequelize returns DECIMAL columns as strings by default; kept as
	// `string` here to reflect that faithfully (parse in the service layer
	// that consumes it).
	declare exchangeRate: string
	declare subTotal: CreationOptional<string>
	declare taxAmount: CreationOptional<string>
	declare totalAmount: CreationOptional<string>
	declare issuedDate: string
	declare dueDate: string
	declare notes: CreationOptional<string | null>
	declare status: CreationOptional<InvoiceStatus>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	declare project?: NonAttribute<Project>
	declare currency?: NonAttribute<Currency>
	declare lineItems?: NonAttribute<InvoiceLineItem[]>

	// Note: the migration also adds `active_invoice_marker`, a MySQL
	// generated STORED column that exists purely to back a DB-level unique
	// index (at most one non-deleted invoice per project + exact billing
	// period). It is DB-managed, never read or written by the app, and
	// intentionally has no attribute here.

	// Define searchable fields
	static searchableFields: string[] = ['invoiceNumber', 'clientName']

	static associate(models: {
		Project: ModelStatic<Project>
		Currency: ModelStatic<Currency>
		InvoiceLineItem: ModelStatic<InvoiceLineItem>
	}) {
		Invoice.belongsTo(models.Project, {
			foreignKey: 'projectId',
			as: 'project',
		})
		Invoice.belongsTo(models.Currency, {
			foreignKey: 'currencyId',
			as: 'currency',
		})
		Invoice.hasMany(models.InvoiceLineItem, {
			foreignKey: 'invoiceId',
			as: 'lineItems',
		})
	}
}

export function initInvoice(sequelize: Sequelize): typeof Invoice {
	Invoice.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			invoiceNumber: {
				type: DataTypes.STRING(30),
				allowNull: false,
				unique: true,
				field: 'invoice_number',
			},
			projectId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'project_id',
			},
			clientName: {
				type: DataTypes.STRING,
				allowNull: false,
				field: 'client_name',
			},
			clientEmail: {
				type: DataTypes.STRING,
				allowNull: true,
				field: 'client_email',
			},
			billingPeriodStart: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'billing_period_start',
			},
			billingPeriodEnd: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'billing_period_end',
			},
			currencyId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'currency_id',
			},
			exchangeRate: {
				type: DataTypes.DECIMAL(18, 6),
				allowNull: false,
				field: 'exchange_rate',
			},
			subTotal: {
				type: DataTypes.DECIMAL(14, 2),
				allowNull: false,
				defaultValue: 0.0,
				field: 'sub_total',
			},
			taxAmount: {
				type: DataTypes.DECIMAL(14, 2),
				allowNull: false,
				defaultValue: 0.0,
				field: 'tax_amount',
			},
			totalAmount: {
				type: DataTypes.DECIMAL(14, 2),
				allowNull: false,
				defaultValue: 0.0,
				field: 'total_amount',
			},
			issuedDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'issued_date',
			},
			dueDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'due_date',
			},
			notes: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			status: {
				type: DataTypes.ENUM(...Object.values(INVOICE_STATUS)),
				allowNull: false,
				defaultValue: INVOICE_STATUS.DRAFT,
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
			modelName: 'Invoice',
			tableName: 'invoices',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return Invoice
}

export type InvoiceModel = ModelStatic<Invoice>
