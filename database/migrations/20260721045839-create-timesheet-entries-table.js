'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('timesheet_entries', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			// The authenticated caller who logged the entry. RESTRICT (not
			// CASCADE): this table is a billing-relevant audit trail of hours
			// worked, so a hard delete of a user (User itself is `paranoid`, so
			// this only fires on an explicit force-delete) must not silently
			// wipe that history.
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
			// Same audit-preservation reasoning as user_id above.
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
			// Resolved automatically (service layer) from entry_date at write
			// time against the existing TimesheetPeriod entity (Module 3).
			// Same audit-preservation reasoning as user_id/project_id above:
			// RESTRICT so a period can't be hard-deleted out from under entries
			// that reference it.
			timesheet_period_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'timesheet_periods',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			entry_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			// Fractional hours (e.g. 7.5). DECIMAL(4,2) mirrors
			// projects.max_daily_hours so an entry's hours can be compared
			// directly against the owning project's cap without a type
			// coercion, and comfortably covers any realistic single-day value.
			// The > 0 / <= project.max_daily_hours rule is service-layer
			// validation (TS-07), not a DB constraint.
			hours: {
				type: Sequelize.DECIMAL(4, 2),
				allowNull: false,
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: false,
			},
			is_approved: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			// Distinct action from creation/edit, performed by a project/system
			// admin. Nullable because an entry is created unapproved and has no
			// approver yet; cleared back to NULL if unapproved. RESTRICT (not
			// CASCADE/SET NULL) so a hard delete of a user can't silently erase
			// who approved an entry.
			approved_by: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: {
					model: 'users',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
			},
			approved_at: {
				type: Sequelize.DATE,
				allowNull: true,
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

		// Hot lookup paths (GetAllTimesheetEntries / TS-03, TS-06): by user, by
		// project, by date range, by period, by approval status.
		await queryInterface.addIndex('timesheet_entries', ['user_id'], {
			name: 'timesheet_entries_user_id_idx',
		})

		await queryInterface.addIndex('timesheet_entries', ['project_id'], {
			name: 'timesheet_entries_project_id_idx',
		})

		// Supports startDate/endDate range filtering and the daily/weekly
		// aggregate totals (summed at query time from stored rows).
		await queryInterface.addIndex('timesheet_entries', ['entry_date'], {
			name: 'timesheet_entries_entry_date_idx',
		})

		await queryInterface.addIndex('timesheet_entries', ['timesheet_period_id'], {
			name: 'timesheet_entries_timesheet_period_id_idx',
		})

		await queryInterface.addIndex('timesheet_entries', ['is_approved'], {
			name: 'timesheet_entries_is_approved_idx',
		})

		// FK lookup / join (WHO approved an entry).
		await queryInterface.addIndex('timesheet_entries', ['approved_by'], {
			name: 'timesheet_entries_approved_by_idx',
		})

		// MySQL has no native partial/filtered unique index (unlike Postgres'
		// `WHERE` clause on CREATE UNIQUE INDEX), so the "no duplicate entry for
		// the same user + project + date" rule (400 on CreateTimesheetEntry) is
		// enforced via a generated STORED column that only takes a concrete
		// value when the row is a "live" (non-soft-deleted) entry, and is NULL
		// otherwise. MySQL unique indexes treat NULL as distinct from every
		// other NULL, so any number of paranoid-deleted history rows for the
		// same (user_id, project_id, entry_date) tuple are allowed, but at most
		// one row with an actual value of 1 - i.e. at most one currently
		// non-deleted entry - can exist per (user_id, project_id, entry_date).
		await queryInterface.sequelize.query(`
			ALTER TABLE timesheet_entries
			ADD COLUMN active_entry_marker TINYINT
			GENERATED ALWAYS AS (
				CASE
					WHEN deleted_at IS NULL THEN 1
					ELSE NULL
				END
			) STORED
		`)

		await queryInterface.addIndex(
			'timesheet_entries',
			['user_id', 'project_id', 'entry_date', 'active_entry_marker'],
			{
				name: 'timesheet_entries_active_user_project_date_uidx',
				unique: true,
			}
		)
	},

	async down(queryInterface) {
		await queryInterface.dropTable('timesheet_entries')
	},
}
