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
import { Currency } from './Currency'

export class ExchangeRate extends Model<
	InferAttributes<ExchangeRate>,
	InferCreationAttributes<ExchangeRate>
> {
	declare id: CreationOptional<number>
	declare fromCurrencyId: number
	declare toCurrencyId: number
	// Sequelize returns DECIMAL columns as strings by default; kept as
	// `string` here to reflect that faithfully (parse in the service layer
	// that consumes it). "1 unit of fromCurrency converts to `rate` units of
	// toCurrency".
	declare rate: string
	declare effectiveDate: string
	declare isActive: CreationOptional<boolean>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	declare fromCurrency?: NonAttribute<Currency>
	declare toCurrency?: NonAttribute<Currency>

	// Note: the migration also adds `active_exchange_rate_marker`, a MySQL
	// generated STORED column that exists purely to back a DB-level unique
	// index (at most one active, non-deleted exchange rate per
	// from/to-currency pair + effective date). It is DB-managed, never read
	// or written by the app, and intentionally has no attribute here.

	static associate(models: { Currency: ModelStatic<Currency> }) {
		ExchangeRate.belongsTo(models.Currency, {
			foreignKey: 'fromCurrencyId',
			as: 'fromCurrency',
		})
		ExchangeRate.belongsTo(models.Currency, {
			foreignKey: 'toCurrencyId',
			as: 'toCurrency',
		})
	}
}

export function initExchangeRate(sequelize: Sequelize): typeof ExchangeRate {
	ExchangeRate.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			fromCurrencyId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'from_currency_id',
			},
			toCurrencyId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'to_currency_id',
			},
			rate: {
				type: DataTypes.DECIMAL(18, 6),
				allowNull: false,
			},
			effectiveDate: {
				type: DataTypes.DATEONLY,
				allowNull: false,
				field: 'effective_date',
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
			modelName: 'ExchangeRate',
			tableName: 'exchange_rates',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return ExchangeRate
}

export type ExchangeRateModel = ModelStatic<ExchangeRate>
