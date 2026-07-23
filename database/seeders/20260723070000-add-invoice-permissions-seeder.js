'use strict'

const { INVOICE_PERMISSION } = require('../constants')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const allPermissions = [...Object.values(INVOICE_PERMISSION)]

		// Check which permissions already exist in the database
		const existingPermissions = await queryInterface.sequelize.query(
			'SELECT name FROM permissions WHERE name IN (:permissions)',
			{
				type: queryInterface.sequelize.QueryTypes.SELECT,
				replacements: { permissions: allPermissions },
			}
		)

		// Extract just the permission names from the result
		const existingPermissionNames = existingPermissions.map(
			(perm) => perm.name
		)

		// Filter out permissions that already exist
		const newPermissions = allPermissions.filter(
			(permission) => !existingPermissionNames.includes(permission)
		)

		// Only insert if there are new permissions to add
		if (newPermissions.length > 0) {
			const permissionObj = newPermissions.map((permissionName) => {
				return {
					name: permissionName,
					created_at: new Date(),
					updated_at: new Date(),
				}
			})
			await queryInterface.bulkInsert('permissions', permissionObj, {})
		}
	},

	async down(queryInterface, Sequelize) {
		const allPermissions = [...Object.values(INVOICE_PERMISSION)]

		await queryInterface.bulkDelete('permissions', {
			name: allPermissions,
		})
	},
}
