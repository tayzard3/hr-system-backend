'use strict'

const { Op } = require('sequelize')
const bcrypt = require('bcryptjs')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		let hashedPassword = null
		await bcrypt.hash('@dminp@ss', 10).then(function (hash) {
			hashedPassword = hash
		})

		await queryInterface.bulkInsert(
			'users',
			[
				{
					name: 'Developer',
					email: 'tayzar.aung@d3-sg.com',
					password: hashedPassword,
					status: 'ACTIVE',
					created_at: new Date(),
					updated_at: new Date(),
				},
			],
			{}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.bulkDelete('users', {
			[Op.or]: [{ email: 'tayzar.job@gmail.com' }],
		})
	},
}
