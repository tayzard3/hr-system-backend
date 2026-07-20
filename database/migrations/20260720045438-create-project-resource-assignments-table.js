'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('project_resource_assignments', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			project_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'projects',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// RESTRICT (not CASCADE): this table is an audit trail of who
				// worked on a project under which role. A hard delete of a
				// project (Project itself is `paranoid`, so this only fires on
				// an explicit force-delete) must not silently wipe that
				// history.
				onDelete: 'RESTRICT',
			},
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'users',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				// Same audit-preservation reasoning as project_id above.
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
				// Same audit-preservation reasoning as project_id above.
				onDelete: 'RESTRICT',
			},
			// Business "assigned at" moment, returned in API responses
			// (GetProjectAssignments, AssignResource) and used for
			// display/audit. Distinct from created_at, which is a pure
			// row-bookkeeping timestamp.
			assigned_at: {
				type: Sequelize.DATE,
				allowNull: false,
				defaultValue: Sequelize.NOW,
			},
			// Business-level soft-remove flag toggled off by RemoveResource.
			// Distinct from deleted_at/paranoid below, which is the
			// framework-level soft delete kept for consistency with
			// Project/ResourceRoleType and is not touched by RemoveResource.
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

		await queryInterface.addIndex('project_resource_assignments', ['project_id'], {
			name: 'project_resource_assignments_project_id_idx',
		})

		await queryInterface.addIndex('project_resource_assignments', ['user_id'], {
			name: 'project_resource_assignments_user_id_idx',
		})

		await queryInterface.addIndex(
			'project_resource_assignments',
			['resource_role_type_id'],
			{
				name: 'project_resource_assignments_resource_role_type_id_idx',
			}
		)

		// Supports GetProjectAssignments?isActive= filtering (project_id +
		// is_active is the hot read path for that endpoint).
		await queryInterface.addIndex(
			'project_resource_assignments',
			['project_id', 'is_active'],
			{
				name: 'project_resource_assignments_project_id_is_active_idx',
			}
		)

		// MySQL has no native partial/filtered unique index (unlike
		// Postgres' `WHERE` clause on CREATE UNIQUE INDEX), so the
		// "one active assignment per user per project" rule (409 on
		// AssignResource) is enforced via a generated STORED column that
		// only takes a concrete value when the row is a "live" active
		// assignment, and is NULL otherwise. MySQL unique indexes treat
		// NULL as distinct from every other NULL, so any number of
		// inactive/removed or paranoid-deleted history rows for the same
		// (project_id, user_id) pair are allowed, but at most one row with
		// an actual value of 1 - i.e. at most one currently-active,
		// non-deleted assignment - can exist per (project_id, user_id).
		await queryInterface.sequelize.query(`
			ALTER TABLE project_resource_assignments
			ADD COLUMN active_assignment_marker TINYINT
			GENERATED ALWAYS AS (
				CASE
					WHEN is_active = 1 AND deleted_at IS NULL THEN 1
					ELSE NULL
				END
			) STORED
		`)

		await queryInterface.addIndex(
			'project_resource_assignments',
			['project_id', 'user_id', 'active_assignment_marker'],
			{
				name: 'project_resource_assignments_active_user_project_uidx',
				unique: true,
			}
		)
	},

	async down(queryInterface) {
		await queryInterface.dropTable('project_resource_assignments')
	},
}
