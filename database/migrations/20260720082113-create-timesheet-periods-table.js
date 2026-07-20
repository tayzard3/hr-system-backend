'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('timesheet_periods', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			start_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			end_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			// Denormalized from start_date at write time (service layer), purely
			// to back the GetAllTimesheetPeriods `year`/`month` filters with a
			// plain equality lookup instead of a date-function scan.
			year: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			month: {
				type: Sequelize.INTEGER,
				allowNull: false,
			},
			is_locked: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			locked_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			// Audit reference for the Lock action. Nullable because a period is
			// created unlocked and has no locking user yet; cleared back to NULL
			// by Unlock. RESTRICT (not CASCADE/SET NULL) so a hard delete of a
			// user (User itself is `paranoid`, so this only fires on an explicit
			// force-delete) can't silently erase who locked a period.
			locked_by: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: {
					model: 'users',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'RESTRICT',
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

		// Supports the CreateTimesheetPeriod overlap check (409 rule): the
		// service queries for any non-deleted period where
		// start_date <= :newEndDate AND end_date >= :newStartDate. This
		// composite index lets that range scan use the index on start_date
		// (and covers end_date for the second predicate) instead of a full
		// table scan. Deliberately NOT a unique index: overlap is a range
		// condition, not something MySQL's unique-index equality checks (no
		// exclusion constraints, unlike Postgres) can express — enforcement
		// stays in the service layer.
		await queryInterface.addIndex('timesheet_periods', ['start_date', 'end_date'], {
			name: 'timesheet_periods_start_date_end_date_idx',
		})

		// Supports GetAllTimesheetPeriods `year`/`month` filters.
		await queryInterface.addIndex('timesheet_periods', ['year', 'month'], {
			name: 'timesheet_periods_year_month_idx',
		})

		// Supports GetAllTimesheetPeriods `isLocked` filter.
		await queryInterface.addIndex('timesheet_periods', ['is_locked'], {
			name: 'timesheet_periods_is_locked_idx',
		})

		// Supports the lock-audit FK lookup / join (WHO locked a period).
		await queryInterface.addIndex('timesheet_periods', ['locked_by'], {
			name: 'timesheet_periods_locked_by_idx',
		})
	},
	async down(queryInterface) {
		await queryInterface.dropTable('timesheet_periods')
	},
}
