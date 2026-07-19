'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('projects', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			code: {
				type: Sequelize.STRING(50),
				allowNull: false,
				unique: true,
			},
			name: {
				type: Sequelize.STRING,
				allowNull: false,
			},
			description: {
				type: Sequelize.TEXT,
				allowNull: true,
			},
			client_name: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			client_email: {
				type: Sequelize.STRING,
				allowNull: true,
			},
			start_date: {
				type: Sequelize.DATEONLY,
				allowNull: false,
			},
			end_date: {
				type: Sequelize.DATEONLY,
				allowNull: true,
			},
			// Max hours a single resource may log against this project in one
			// day. Consumed by future timesheet-entry validation (TS-07), not
			// by this feature. Defaulted (rather than left nullable) so every
			// project row has a usable value for that future validation.
			max_daily_hours: {
				type: Sequelize.DECIMAL(4, 2),
				allowNull: false,
				defaultValue: 8.0,
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

		await queryInterface.addIndex('projects', ['is_active'], {
			name: 'projects_is_active_idx',
		})

		await queryInterface.addIndex('projects', ['client_name'], {
			name: 'projects_client_name_idx',
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('projects')
	},
}
