'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('currencies', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			// 3-character ISO-style code (e.g. "SGD", "USD"). Case-normalization
			// to uppercase is an application-level concern (service layer, same
			// as Country.code today) — the DB only enforces uniqueness of
			// whatever value is stored.
			code: {
				type: Sequelize.STRING(3),
				allowNull: false,
				unique: true,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			// UI/report formatting only (e.g. "S$", "$") — never used for lookups.
			symbol: {
				type: Sequelize.STRING(10),
				allowNull: false,
			},
			is_base_currency: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
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

		// Supports GetAllCurrencies `isActive` filter.
		await queryInterface.addIndex('currencies', ['is_active'], {
			name: 'currencies_is_active_idx',
		})

		// Business rule: at most one currency may be the base/default currency
		// at a time. MySQL has no native partial/filtered unique index (unlike
		// Postgres' `WHERE` clause on CREATE UNIQUE INDEX), so this is enforced
		// via a generated STORED column that only takes a concrete value (1)
		// when the row IS the base currency AND is not soft-deleted, and is
		// NULL otherwise. MySQL unique indexes treat NULL as distinct from
		// every other NULL, so any number of rows with is_base_currency = false,
		// plus any number of soft-deleted rows, are unaffected — but at most
		// one currently non-deleted row with is_base_currency = true can exist.
		// This is a DB-level backstop; the service layer should still
		// explicitly unset any previous base currency on create/update so the
		// business rule fails with a clean 4xx instead of a raw DB error.
		await queryInterface.sequelize.query(`
			ALTER TABLE currencies
			ADD COLUMN active_base_currency_marker TINYINT
			GENERATED ALWAYS AS (
				CASE
					WHEN is_base_currency = TRUE AND deleted_at IS NULL THEN 1
					ELSE NULL
				END
			) STORED
		`)

		await queryInterface.addIndex('currencies', ['active_base_currency_marker'], {
			name: 'currencies_active_base_currency_uidx',
			unique: true,
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('currencies')
	},
}
