'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const role = await queryInterface.sequelize.query(
			"SELECT id FROM roles WHERE name='Developer';",
			{ type: Sequelize.QueryTypes.SELECT, plain: true }
		)

		const permissions = await queryInterface.sequelize.query(
			'SELECT id FROM permissions;',
			{ type: Sequelize.QueryTypes.SELECT }
		)

		const rolePermissions = permissions.map((permission) => {
			return {
				permission_id: permission.id,
				role_id: role.id,
				created_at: new Date(),
				updated_at: new Date(),
			}
		})

		await queryInterface.bulkInsert('role_permissions', rolePermissions, {})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('role_permissions', null, {})
	},
}
