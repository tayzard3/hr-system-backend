'use strict'

const { PROJECT_PERMISSION } = require('../constants')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const newAssignmentPermissions = [
			PROJECT_PERMISSION.ASSIGN_RESOURCE,
			PROJECT_PERMISSION.REMOVE_RESOURCE,
		]

		const role = await queryInterface.sequelize.query(
			"SELECT id FROM roles WHERE name='Developer';",
			{ type: Sequelize.QueryTypes.SELECT, plain: true }
		)

		if (!role) {
			return
		}

		const permissions = await queryInterface.sequelize.query(
			'SELECT id FROM permissions WHERE name IN (:permissions);',
			{
				type: Sequelize.QueryTypes.SELECT,
				replacements: { permissions: newAssignmentPermissions },
			}
		)

		// Skip permissions already assigned to the Developer role to keep this
		// seeder safely re-runnable and avoid violating the (role_id, permission_id)
		// composite primary key on `role_permissions`.
		const existingRolePermissions = await queryInterface.sequelize.query(
			'SELECT permission_id FROM role_permissions WHERE role_id = :roleId;',
			{
				type: Sequelize.QueryTypes.SELECT,
				replacements: { roleId: role.id },
			}
		)
		const existingPermissionIds = existingRolePermissions.map(
			(rolePermission) => rolePermission.permission_id
		)

		const newRolePermissions = permissions
			.filter(
				(permission) => !existingPermissionIds.includes(permission.id)
			)
			.map((permission) => {
				return {
					permission_id: permission.id,
					role_id: role.id,
					created_at: new Date(),
					updated_at: new Date(),
				}
			})

		if (newRolePermissions.length > 0) {
			await queryInterface.bulkInsert(
				'role_permissions',
				newRolePermissions,
				{}
			)
		}
	},

	async down(queryInterface, Sequelize) {
		const newAssignmentPermissions = [
			PROJECT_PERMISSION.ASSIGN_RESOURCE,
			PROJECT_PERMISSION.REMOVE_RESOURCE,
		]

		const role = await queryInterface.sequelize.query(
			"SELECT id FROM roles WHERE name='Developer';",
			{ type: Sequelize.QueryTypes.SELECT, plain: true }
		)

		if (!role) {
			return
		}

		const permissions = await queryInterface.sequelize.query(
			'SELECT id FROM permissions WHERE name IN (:permissions);',
			{
				type: Sequelize.QueryTypes.SELECT,
				replacements: { permissions: newAssignmentPermissions },
			}
		)
		const permissionIds = permissions.map((permission) => permission.id)

		if (permissionIds.length > 0) {
			await queryInterface.bulkDelete('role_permissions', {
				role_id: role.id,
				permission_id: permissionIds,
			})
		}
	},
}
