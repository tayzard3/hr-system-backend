'use strict'

const { Op } = require('sequelize')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.bulkInsert(
			'roles',
			[
				{
					name: 'Developer',
					created_at: new Date(),
					updated_at: new Date(),
				},
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('roles', {
			[Op.or]: [{ name: 'Developer' }],
		})
	},
}
