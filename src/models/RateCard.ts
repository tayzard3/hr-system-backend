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
import { Country } from './Country'
import { ResourceRoleType } from './ResourceRoleType'
import { Currency } from './Currency'

export class RateCard extends Model<InferAttributes<RateCard>, InferCreationAttributes<RateCard>> {
	declare id: CreationOptional<number>
	declare countryId: number
	declare resourceRoleTypeId: number
	declare currencyId: number
	// Sequelize returns DECIMAL columns as strings by default; kept as
	// `string` here to reflect that faithfully (parse in the service layer
	// that consumes it).
	//
	// Internal hourly cost rate — see migration for the follow-up note on
	// how this maps (or doesn't yet) to the API spec's single `hourlyRate`
	// field.
	declare costRate: string
	// Client-facing hourly billing rate — this is the field the API spec's
	// `hourlyRate` request/response property maps to.
	declare billingRate: string
	declare effectiveDate: string
	declare isActive: CreationOptional<boolean>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	declare country?: NonAttribute<Country>
	declare resourceRoleType?: NonAttribute<ResourceRoleType>
	declare currency?: NonAttribute<Currency>

	// Note: the migration also adds `active_rate_card_marker`, a MySQL
	// generated STORED column that exists purely to back a DB-level unique
	// index (at most one active rate card per country+role+effective-date).
	// It is DB-managed, never read or written by the app, and intentionally
	// has no attribute here.

	static associate(models: {
		Country: ModelStatic<Country>
		ResourceRoleType: ModelStatic<ResourceRoleType>
		Currency: ModelStatic<Currency>
	}) {
		RateCard.belongsTo(models.Country, {
			foreignKey: 'countryId',
			as: 'country',
		})
		RateCard.belongsTo(models.ResourceRoleType, {
			foreignKey: 'resourceRoleTypeId',
			as: 'resourceRoleType',
		})
		RateCard.belongsTo(models.Currency, {
			foreignKey: 'currencyId',
			as: 'currency',
		})
	}
}

export function initRateCard(sequelize: Sequelize): typeof RateCard {
	RateCard.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			countryId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'country_id',
			},
			resourceRoleTypeId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'resource_role_type_id',
			},
			currencyId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'currency_id',
			},
			costRate: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: false,
				field: 'cost_rate',
			},
			billingRate: {
				type: DataTypes.DECIMAL(12, 2),
				allowNull: false,
				field: 'billing_rate',
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
			modelName: 'RateCard',
			tableName: 'rate_cards',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return RateCard
}

export type RateCardModel = ModelStatic<RateCard>
