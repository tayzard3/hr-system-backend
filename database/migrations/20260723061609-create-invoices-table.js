'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('invoices', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			// Human-readable, sequential, client-facing number (e.g.
			// "INV-2026-0001"). System-generated (service layer), never
			// client-supplied. Unique so it can double as a lookup key (e.g.
			// GetInvoicePdf filename) without exposing the internal `id`.
			invoice_number: {
				type: Sequelize.STRING(30),
				allowNull: false,
				unique: true,
			},
			// RESTRICT (not CASCADE): invoices are financial records. A hard
			// delete of a project (Project itself is `paranoid`, so this only
			// fires on an explicit force-delete) must not silently wipe
			// historical billing data. client_name/client_email below are
			// deliberately NOT foreign keys to Project — they are point-in-time
			// snapshots (Project.client_name/client_email can change later; the
			// invoice must keep what was true when it was billed).
			project_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'projects',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			// Snapshot of Project.client_name at generation time. NOT NULL:
			// unlike Project.client_name (nullable, since a project may not yet
			// have a client assigned), an invoice cannot be billed without a
			// client to bill it to — the service layer is expected to validate
			// this before calling GenerateInvoice.
			client_name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			// Snapshot of Project.client_email at generation time. Nullable to
			// mirror Project.client_email's own optionality.
			client_email: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			billing_period_start: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			billing_period_end: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			// RESTRICT: same audit-preservation reasoning as project_id above.
			currency_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'currencies',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			// Rate applied to convert from the base currency to currency_id at
			// generation time ("1 unit of base currency converts to `rate`
			// units of currency_id"), copied permanently from ExchangeRate.rate
			// at that moment — never re-derived later, since exchange rates
			// change over time and the invoice must not silently change with
			// them. Same DECIMAL(18,6) precision as exchange_rates.rate.
			exchange_rate: {
				type: Sequelize.DECIMAL(18, 6),
				allowNull: false,
			},
			// Sum of all line item amounts, in currency_id. DECIMAL(14,2) (two
			// more integer digits than rate_cards.billing_rate's DECIMAL(12,2))
			// since this is an aggregate across many line items rather than a
			// single hourly rate.
			sub_total: {
				type: Sequelize.DECIMAL(14, 2),
				allowNull: false,
				defaultValue: 0.0,
			},
			tax_amount: {
				type: Sequelize.DECIMAL(14, 2),
				allowNull: false,
				defaultValue: 0.0,
			},
			total_amount: {
				type: Sequelize.DECIMAL(14, 2),
				allowNull: false,
				defaultValue: 0.0,
			},
			issued_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			due_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			notes: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			// Fixed lifecycle: Draft -> Sent -> Paid, or Draft -> Void/Cancelled.
			// Only a Draft invoice may be edited or deleted (service-layer rule,
			// not DB-enforced). Defaults to Draft since GenerateInvoice always
			// creates a draft.
			status: {
				type: Sequelize.ENUM('Draft', 'Sent', 'Paid', 'Void', 'Cancelled'),
				allowNull: false,
				defaultValue: 'Draft',
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

		await queryInterface.addIndex('invoices', ['project_id'], {
			name: 'invoices_project_id_idx',
		})

		await queryInterface.addIndex('invoices', ['currency_id'], {
			name: 'invoices_currency_id_idx',
		})

		// Supports GetAllInvoices `status` filter.
		await queryInterface.addIndex('invoices', ['status'], {
			name: 'invoices_status_idx',
		})

		// Supports GetAllInvoices `startDate`/`endDate` (billing period) range
		// filtering, and GenerateInvoice's "does this project already have an
		// invoice overlapping this period?" lookup. MySQL has no native
		// range-overlap index type, so exact-overlap detection (period_start <
		// existing.period_end AND period_end > existing.period_start) is a
		// service-layer query that uses this composite index as a leftmost
		// prefix scan on project_id; it is NOT itself sufficient to fully
		// enforce "no overlapping periods" at the DB level.
		await queryInterface.addIndex(
			'invoices',
			['project_id', 'billing_period_start', 'billing_period_end'],
			{
				name: 'invoices_project_billing_period_idx',
			}
		)

		// DB-level backstop for the narrower case of an exact duplicate
		// (project_id, billing_period_start, billing_period_end) — the
		// "duplicate invoice for same project + period" 409 case called out
		// explicitly in the API spec. This does NOT catch a merely
		// *overlapping* (non-identical) period; that check is service-layer,
		// using the index above. MySQL has no native partial/filtered unique
		// index (unlike Postgres' `WHERE` clause on CREATE UNIQUE INDEX), so
		// this is enforced via a generated STORED column that only takes a
		// concrete value (1) when the row is not soft-deleted, and is NULL
		// otherwise — matching the same pattern used by rate_cards,
		// exchange_rates, currencies and timesheet_entries. Note this counts a
		// Void/Cancelled invoice as still "occupying" its period unless it is
		// also soft-deleted; if the business wants a voided/cancelled invoice
		// to free up its period for re-generation, that is a service-layer
		// decision (e.g. soft-delete on void) to make in a later release, not
		// a schema change.
		await queryInterface.sequelize.query(`
			ALTER TABLE invoices
			ADD COLUMN active_invoice_marker TINYINT
			GENERATED ALWAYS AS (
				CASE
					WHEN deleted_at IS NULL THEN 1
					ELSE NULL
				END
			) STORED
		`)

		await queryInterface.addIndex(
			'invoices',
			['project_id', 'billing_period_start', 'billing_period_end', 'active_invoice_marker'],
			{
				name: 'invoices_active_project_billing_period_uidx',
				unique: true,
			}
		)
	},

	async down(queryInterface) {
		// MySQL ENUM values are stored inline on the column definition (unlike
		// Postgres' separate named ENUM types), so dropping the table is
		// sufficient cleanup — no separate ENUM type to drop.
		await queryInterface.dropTable('invoices')
	},
}
