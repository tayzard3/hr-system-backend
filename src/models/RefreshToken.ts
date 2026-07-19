'use strict'
import {
	DataTypes,
	Model,
	Sequelize,
	ModelStatic,
	NonAttribute,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	BelongsToGetAssociationMixin,
} from 'sequelize'
import { User } from './User'

export class RefreshToken extends Model<
	InferAttributes<RefreshToken>,
	InferCreationAttributes<RefreshToken>
> {
	declare id: CreationOptional<number>
	declare userId: number
	declare tokenHash: string
	declare expiresAt: Date
	declare revokedAt: CreationOptional<Date | null>
	declare replacedById: CreationOptional<number | null>
	declare user?: NonAttribute<User>
	declare replacedBy?: NonAttribute<RefreshToken | null>
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>

	static associate(models: {
		User: ModelStatic<User>
		RefreshToken: ModelStatic<RefreshToken>
	}) {
		RefreshToken.belongsTo(models.User, {
			foreignKey: 'userId',
			as: 'user',
		})
		RefreshToken.belongsTo(models.RefreshToken, {
			foreignKey: 'replacedById',
			as: 'replacedBy',
		})
	}

	declare getUser: BelongsToGetAssociationMixin<User>
}

export function initRefreshToken(sequelize: Sequelize) {
	RefreshToken.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				allowNull: false,
				autoIncrement: true,
			},
			userId: {
				type: DataTypes.INTEGER,
				allowNull: false,
				field: 'user_id',
			},
			tokenHash: {
				type: DataTypes.STRING(255),
				allowNull: false,
				unique: true,
				field: 'token_hash',
			},
			expiresAt: {
				type: DataTypes.DATE,
				allowNull: false,
				field: 'expires_at',
			},
			revokedAt: {
				type: DataTypes.DATE,
				allowNull: true,
				field: 'revoked_at',
			},
			replacedById: {
				type: DataTypes.INTEGER,
				allowNull: true,
				field: 'replaced_by_id',
			},
			createdAt: {
				allowNull: false,
				type: DataTypes.DATE,
				field: 'created_at',
			},
			updatedAt: {
				allowNull: false,
				type: DataTypes.DATE,
				field: 'updated_at',
			},
		},
		{
			sequelize,
			modelName: 'RefreshToken',
			tableName: 'refresh_tokens',
			timestamps: true,
			underscored: true,
		}
	)

	return RefreshToken
}

export type RefreshTokenModel = ModelStatic<RefreshToken>
