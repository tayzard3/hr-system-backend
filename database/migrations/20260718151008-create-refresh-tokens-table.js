'use strict'
module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.createTable('refresh_tokens', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			user_id: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'users',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			token_hash: {
				type: Sequelize.STRING(255),
				allowNull: false,
				unique: true,
			},
			expires_at: {
				type: Sequelize.DATE,
				allowNull: false,
			},
			revoked_at: {
				type: Sequelize.DATE,
				allowNull: true,
			},
			replaced_by_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
				references: {
					model: 'refresh_tokens',
					key: 'id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'SET NULL',
			},
			created_at: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updated_at: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})

		await queryInterface.addIndex('refresh_tokens', ['user_id'], {
			name: 'refresh_tokens_user_id_idx',
		})
	},
	down: async (queryInterface) => {
		await queryInterface.removeIndex(
			'refresh_tokens',
			'refresh_tokens_user_id_idx'
		)
		await queryInterface.dropTable('refresh_tokens')
	},
}
