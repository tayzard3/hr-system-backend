'use strict'
const { Op } = require('sequelize')

module.exports = {
	async up(queryInterface, Sequelize) {
		const role = await queryInterface.sequelize.query(
			"SELECT id FROM roles WHERE name='Developer';",
			{ type: Sequelize.QueryTypes.SELECT, plain: true }
		)
		const users = await queryInterface.sequelize.query(
			'SELECT id FROM users WHERE deleted_at IS NULL;',
			{ type: Sequelize.QueryTypes.SELECT }
		)
		const userRoles = users.map((user) => {
			return {
				user_id: user.id,
				role_id: role.id,
				created_at: new Date(),
				updated_at: new Date(),
			}
		})

		await queryInterface.bulkInsert('user_roles', userRoles, {})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('user_roles', {
			[Op.or]: [{ user_id: 1 }],
		})
	},
}
