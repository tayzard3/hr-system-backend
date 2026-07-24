'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('invoice_line_items', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			// A line item is entirely owned/composed by its invoice (it has no
			// meaning on its own), unlike the RESTRICT-protected FKs elsewhere
			// in this schema — so CASCADE here on a real (non-soft) delete of
			// the parent invoice is intentional. In normal operation invoices
			// are only ever soft-deleted (paranoid), which does NOT trigger
			// this cascade; the service layer is responsible for also
			// handling line items (and freeing up timesheet_entries.invoiced_at)
			// when a Draft invoice is deleted.
			invoice_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'invoices',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			// The user who performed the billed work. RESTRICT (not CASCADE):
			// same billing-audit-trail reasoning as timesheet_entries.user_id —
			// a hard delete of a user (User itself is `paranoid`) must not
			// silently wipe historical invoice line item data.
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'users',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			// Which resource role type the user was billed as for this line
			// (drives which rate card applied). RESTRICT: same billing-audit
			// reasoning as above.
			resource_role_type_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'resource_role_types',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			// Traceability back to the source timesheet entry, and (via the
			// unique index below) the DB-level mechanism that guarantees a
			// given timesheet entry can never be billed on more than one
			// invoice line item. RESTRICT: a hard delete of a timesheet entry
			// (paranoid, same as above) must not silently erase which entry a
			// historical invoice line item came from.
			timesheet_entry_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'timesheet_entries',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			// Snapshot of the timesheet entry's task description at billing
			// time (copied, not referenced live).
			description: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			// Snapshot of hours billed. Same DECIMAL(4,2) precision as
			// timesheet_entries.hours, since it is copied from there at
			// generation time. The > 0 rule is service-layer validation (same
			// convention as timesheet_entries.hours), not a DB constraint.
			hours: {
				type: Sequelize.DECIMAL(4, 2),
				allowNull: false,
			},
			// Snapshot of the hourly rate applied (from RateCard.billingRate,
			// converted into the invoice's billing currency), permanently
			// fixed at generation time — rate cards and exchange rates can
			// change after the invoice is issued, and the invoice must not
			// silently change with them. Same DECIMAL(12,2) precision as
			// rate_cards.billing_rate.
			unit_rate: {
				type: Sequelize.DECIMAL(12, 2),
				allowNull: false,
			},
			// hours * unit_rate, in the invoice's billing currency (currency_id
			// on the parent invoice). Stored (not recomputed at read time) for
			// the same "must not silently change later" reasoning as
			// unit_rate. DECIMAL(14,2) to match invoices.sub_total /
			// total_amount precision (a header total is a sum of these).
			amount: {
				type: Sequelize.DECIMAL(14, 2),
				allowNull: false,
			},
			created_at: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updated_at: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})

		await queryInterface.addIndex('invoice_line_items', ['invoice_id'], {
			name: 'invoice_line_items_invoice_id_idx',
		})

		await queryInterface.addIndex('invoice_line_items', ['user_id'], {
			name: 'invoice_line_items_user_id_idx',
		})

		await queryInterface.addIndex('invoice_line_items', ['resource_role_type_id'], {
			name: 'invoice_line_items_resource_role_type_id_idx',
		})

		// Enforces "a given approved timesheet entry can only ever be pulled
		// into one invoice line item, across all invoices" at the DB level —
		// this table has no soft-delete, so a plain unique index (no
		// generated-marker-column workaround needed, unlike timesheet_entries/
		// rate_cards/exchange_rates/currencies/invoices above) is sufficient.
		// This is the primary, durable double-billing guard called for in the
		// requirements; timesheet_entries.invoiced_at (added in a companion
		// migration) is a denormalised, cheaper-to-check mirror of the same
		// fact for hot-path reads (e.g. UnapproveTimesheetEntry).
		await queryInterface.addIndex('invoice_line_items', ['timesheet_entry_id'], {
			name: 'invoice_line_items_timesheet_entry_id_uidx',
			unique: true,
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('invoice_line_items')
	},
}
