'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('exchange_rates', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			from_currency_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'currencies',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// RESTRICT (not CASCADE): exchange rates are financial reference
				// data that Module 6 invoicing will depend on to convert historical
				// invoice amounts. A hard delete of a currency (Currency itself is
				// `paranoid`, so this only fires on an explicit force-delete) must
				// not silently orphan or wipe historical rate data still referenced
				// by past invoices/reports.
				onDelete: 'RESTRICT',
			},
			to_currency_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'currencies',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// Same reasoning as from_currency_id above.
				onDelete: 'RESTRICT',
			},
			// "1 unit of from_currency converts to `rate` units of to_currency".
			// DECIMAL(18,6): 6 decimal places per the spec's examples (e.g.
			// 0.740000) to avoid rounding drift in invoice currency conversion,
			// with 12 integer digits of headroom (well beyond any realistic
			// currency conversion factor) — more precision than the 2-decimal
			// money amounts used elsewhere (e.g. rate_cards.cost_rate /
			// billing_rate), since this is a multiplier, not a money amount.
			rate: {
				type: Sequelize.DECIMAL(18, 6),
				allowNull: false,
			},
			// Date from which this rate applies. DATEONLY (no time component),
			// matching rate_cards.effective_date's convention — rates change on a
			// calendar-day granularity.
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

		await queryInterface.addIndex('exchange_rates', ['from_currency_id'], {
			name: 'exchange_rates_from_currency_id_idx',
		})

		await queryInterface.addIndex('exchange_rates', ['to_currency_id'], {
			name: 'exchange_rates_to_currency_id_idx',
		})

		// Supports GetAllExchangeRates `isActive` filter.
		await queryInterface.addIndex('exchange_rates', ['is_active'], {
			name: 'exchange_rates_is_active_idx',
		})

		// Supports the "latest active rate for a currency pair" lookup (WHERE
		// from_currency_id = ? AND to_currency_id = ? AND is_active = 1 AND
		// effective_date <= :asOfDate ORDER BY effective_date DESC LIMIT 1) that
		// Module 6 invoicing will depend on at invoice-generation time, as well
		// as GetAllExchangeRates' from/to/isActive/effectiveDate filtering — all
		// of these filter on a leftmost prefix of this composite index, with
		// effective_date last to support the range/ORDER BY on the same index.
		await queryInterface.addIndex(
			'exchange_rates',
			['from_currency_id', 'to_currency_id', 'is_active', 'effective_date'],
			{
				name: 'exchange_rates_pair_active_effective_date_idx',
			}
		)

		// Business rule decision (flagged as open in the requirements): prevent
		// two *active* rates for the same currency pair + effective date from
		// coexisting, the same way rate_cards enforces "at most one active rate
		// card per country+role+effective-date" — otherwise the "latest active
		// rate for a currency pair" lookup could return an ambiguous result
		// (two equally-recent active rows) for the same as-of date. MySQL has no
		// native partial/filtered unique index (unlike Postgres' `WHERE` clause
		// on CREATE UNIQUE INDEX), so this is enforced via a generated STORED
		// column that only takes a concrete value (1) when the row is active
		// and not soft-deleted, and is NULL otherwise. MySQL unique indexes
		// treat NULL as distinct from every other NULL, so any number of
		// inactive or paranoid-deleted historical rows for the same
		// (from_currency_id, to_currency_id, effective_date) are allowed, but at
		// most one row with an actual value of 1 - i.e. at most one
		// currently-active, non-deleted exchange rate - can exist per
		// (from_currency_id, to_currency_id, effective_date). This is a DB-level
		// backstop; the service layer should still explicitly
		// deactivate/validate on create/update so the business rule fails with
		// a clean 4xx instead of a raw DB error.
		await queryInterface.sequelize.query(`
			ALTER TABLE exchange_rates
			ADD COLUMN active_exchange_rate_marker TINYINT
			GENERATED ALWAYS AS (
				CASE
					WHEN is_active = 1 AND deleted_at IS NULL THEN 1
					ELSE NULL
				END
			) STORED
		`)

		await queryInterface.addIndex(
			'exchange_rates',
			['from_currency_id', 'to_currency_id', 'effective_date', 'active_exchange_rate_marker'],
			{
				name: 'exchange_rates_active_pair_effective_uidx',
				unique: true,
			}
		)
	},

	async down(queryInterface) {
		await queryInterface.dropTable('exchange_rates')
	},
}
