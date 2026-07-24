'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		// Durable, cheap-to-check marker of "this entry has already been
		// pulled into an invoice line item", denormalised onto the entry
		// itself (mirroring the approved_by/approved_at nullable-marker
		// convention already used on this table). The authoritative source of
		// truth for double-billing prevention is the unique index on
		// invoice_line_items.timesheet_entry_id (added in the companion
		// create-invoice-line-items-table migration); this column exists so
		// UnapproveTimesheetEntry (and GenerateInvoice's entry-selection
		// query) can check "already invoiced?" with a single-row lookup
		// instead of a join/subquery against invoice_line_items every time.
		// Nullable, no default: existing rows are unaffected (NULL = not yet
		// invoiced) — purely additive.
		await queryInterface.addColumn('timesheet_entries', 'invoiced_at', {
			type: Sequelize.DATE,
			allowNull: true,
			after: 'approved_at',
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('timesheet_entries', 'invoiced_at')
	},
}
