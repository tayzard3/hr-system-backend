'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('rate_cards', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			country_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'countries',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// RESTRICT (not CASCADE): rate cards are billing/reporting
				// reference data. A hard delete of a country (Country itself is
				// `paranoid`, so this only fires on an explicit force-delete)
				// must not silently orphan or wipe historical rate data still
				// referenced by reports/invoices.
				onDelete: 'RESTRICT',
			},
			resource_role_type_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'resource_role_types',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// Same reasoning as country_id above.
				onDelete: 'RESTRICT',
			},
			currency_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'currencies',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// Same reasoning as country_id above.
				onDelete: 'RESTRICT',
			},
			// Internal hourly cost rate, in the currency identified by
			// currency_id. Feeds Module 5's monthly cost/revenue/margin report
			// (the "cost" side of costRate/billingRate). Not currently exposed
			// by the CreateRateCard/UpdateRateCard request bodies in the API
			// spec (which only define a single `hourlyRate` field) — see the
			// risk/reasoning note in the accompanying report for the
			// follow-up needed to confirm this with product/business and
			// decide how the API layer should populate it.
			cost_rate: {
				type: Sequelize.DECIMAL(12, 2),
				allowNull: false,
			},
			// Client-facing hourly billing rate, in the currency identified by
			// currency_id. This is the field the API spec's `hourlyRate`
			// request/response property maps to, and feeds Module 6 invoicing
			// (unitRate on invoice line items) and the "billingRate" side of
			// the Module 5 report.
			billing_rate: {
				type: Sequelize.DECIMAL(12, 2),
				allowNull: false,
			},
			// Date from which this rate applies. DATEONLY (no time component)
			// since rates change on a calendar-day granularity, matching
			// ExchangeRate's effective_date convention.
			effective_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			is_active: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: true,
			},
			created_at: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updated_at: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			deleted_at: {
				type: Sequelize.DATE,
			},
		})

		await queryInterface.addIndex('rate_cards', ['country_id'], {
			name: 'rate_cards_country_id_idx',
		})

		await queryInterface.addIndex('rate_cards', ['resource_role_type_id'], {
			name: 'rate_cards_resource_role_type_id_idx',
		})

		await queryInterface.addIndex('rate_cards', ['currency_id'], {
			name: 'rate_cards_currency_id_idx',
		})

		// Supports GetAllRateCards `isActive` filter.
		await queryInterface.addIndex('rate_cards', ['is_active'], {
			name: 'rate_cards_is_active_idx',
		})

		// Supports LookupRateCard ("most recent rate card for this
		// country+role whose effective_date is <= asOfDate") and
		// GetAllRateCards' country/role/effectiveDate filtering.
		await queryInterface.addIndex(
			'rate_cards',
			['country_id', 'resource_role_type_id', 'effective_date'],
			{
				name: 'rate_cards_country_role_effective_date_idx',
			}
		)

		// MySQL has no native partial/filtered unique index (unlike
		// Postgres' `WHERE` clause on CREATE UNIQUE INDEX), so the business
		// rule "at most one active rate card for a given
		// country+role+effective-date at a time" (avoids ambiguous
		// LookupRateCard results) is enforced via a generated STORED column
		// that only takes a concrete value (1) when the row is active and
		// not soft-deleted, and is NULL otherwise. MySQL unique indexes
		// treat NULL as distinct from every other NULL, so any number of
		// inactive or paranoid-deleted historical rows for the same
		// (country_id, resource_role_type_id, effective_date) are allowed,
		// but at most one row with an actual value of 1 - i.e. at most one
		// currently-active, non-deleted rate card - can exist per
		// (country_id, resource_role_type_id, effective_date). This is a
		// DB-level backstop; the service layer should still explicitly
		// deactivate/validate on create/update so the business rule fails
		// with a clean 4xx instead of a raw DB error.
		await queryInterface.sequelize.query(`
			ALTER TABLE rate_cards
			ADD COLUMN active_rate_card_marker TINYINT
			GENERATED ALWAYS AS (
				CASE
					WHEN is_active = 1 AND deleted_at IS NULL THEN 1
					ELSE NULL
				END
			) STORED
		`)

		await queryInterface.addIndex(
			'rate_cards',
			['country_id', 'resource_role_type_id', 'effective_date', 'active_rate_card_marker'],
			{
				name: 'rate_cards_active_country_role_effective_uidx',
				unique: true,
			}
		)
	},

	async down(queryInterface) {
		await queryInterface.dropTable('rate_cards')
	},
}
