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

export class Currency extends Model<
	InferAttributes<Currency>,
	InferCreationAttributes<Currency>
> {
	declare id: CreationOptional<number>
	declare code: string
	declare name: string
	declare symbol: string
	declare isBaseCurrency: CreationOptional<boolean>
	declare isActive: CreationOptional<boolean>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	// Note: the migration also adds `active_base_currency_marker`, a MySQL
	// generated STORED column that exists purely to back a DB-level unique
	// index (at most one non-deleted row with is_base_currency = true). It is
	// DB-managed, never read or written by the app, and intentionally has no
	// attribute here.

	// Define searchable fields
	static searchableFields = ['code', 'name']
}

export function initCurrency(sequelize: Sequelize): typeof Currency {
	Currency.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			code: {
				type: DataTypes.STRING(3),
				allowNull: false,
				unique: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			symbol: {
				type: DataTypes.STRING(10),
				allowNull: false,
			},
			isBaseCurrency: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
				field: 'is_base_currency',
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
			modelName: 'Currency',
			tableName: 'currencies',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return Currency
}

export type CurrencyModel = ModelStatic<Currency>
