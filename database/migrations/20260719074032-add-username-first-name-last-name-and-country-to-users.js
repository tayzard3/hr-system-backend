'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('users', 'username', {
			type: Sequelize.STRING(50),
			allowNull: true,
			unique: true,
		})

		await queryInterface.addColumn('users', 'first_name', {
			type: Sequelize.STRING,
			allowNull: true,
		})

		await queryInterface.addColumn('users', 'last_name', {
			type: Sequelize.STRING,
			allowNull: true,
		})

		await queryInterface.addColumn('users', 'country_id', {
			type: Sequelize.INTEGER,
			allowNull: true,
			references: {
				model: 'countries',
				key: 'id',
			},
			onUpdate: 'CASCADE',
			onDelete: 'SET NULL',
		})

		await queryInterface.addIndex('users', ['country_id'], {
			name: 'users_country_id_idx',
		})

		// Best-effort backfill of first_name/last_name from the existing
		// `name` column so already-registered users aren't left blank.
		// `name` itself is left untouched here (still read by existing
		// call sites) and is a candidate for a future contract-phase
		// migration once all call sites move to first_name/last_name.
		await queryInterface.sequelize.query(`
			UPDATE users
			SET
				first_name = CASE
					WHEN name IS NULL OR TRIM(name) = '' THEN first_name
					WHEN LOCATE(' ', TRIM(name)) > 0
						THEN SUBSTRING_INDEX(TRIM(name), ' ', 1)
					ELSE TRIM(name)
				END,
				last_name = CASE
					WHEN name IS NULL OR TRIM(name) = '' THEN last_name
					WHEN LOCATE(' ', TRIM(name)) > 0
						THEN TRIM(SUBSTRING(TRIM(name), LOCATE(' ', TRIM(name)) + 1))
					ELSE last_name
				END
			WHERE first_name IS NULL AND last_name IS NULL
		`)
	},

	async down(queryInterface) {
		await queryInterface.removeIndex('users', 'users_country_id_idx')
		await queryInterface.removeColumn('users', 'country_id')
		await queryInterface.removeColumn('users', 'last_name')
		await queryInterface.removeColumn('users', 'first_name')
		await queryInterface.removeColumn('users', 'username')
	},
}
