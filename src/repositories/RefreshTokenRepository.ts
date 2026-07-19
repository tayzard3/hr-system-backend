import { injectable } from 'inversify'
import { FindOptions, InferAttributes, Transaction } from 'sequelize'
import { RefreshToken } from '../models/RefreshToken'
import { BaseRepository } from './BaseRepository'
import { IRefreshTokenRepository } from '../interfaces/repository/IRefreshTokenRepository'

@injectable()
export class RefreshTokenRepository
	extends BaseRepository<RefreshToken>
	implements IRefreshTokenRepository
{
	constructor() {
		super(RefreshToken)
	}

	public async findByTokenHash(
		tokenHash: string,
		options?: FindOptions<InferAttributes<RefreshToken>>
	): Promise<RefreshToken | null> {
		return this.model.findOne({ where: { tokenHash }, ...options })
	}

	public async revoke(
		id: number,
		replacedById: number | null,
		transaction?: Transaction
	): Promise<void> {
		await this.update(
			{ revokedAt: new Date(), replacedById },
			{
				where: { id },
				returning: ['id'],
				transaction,
			}
		)
	}

	public async revokeAllActiveForUser(
		userId: number,
		transaction?: Transaction
	): Promise<number> {
		const [affectedCount] = await this.update(
			{ revokedAt: new Date() },
			{
				where: { userId, revokedAt: null },
				returning: ['id'],
				transaction,
			}
		)

		return affectedCount
	}
}
