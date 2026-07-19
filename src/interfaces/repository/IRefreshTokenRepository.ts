import { FindOptions, InferAttributes, Transaction } from 'sequelize'
import { IBaseRepository } from './IBaseRepository'
import { RefreshToken } from '../../models/RefreshToken'

export interface IRefreshTokenRepository extends IBaseRepository<RefreshToken> {
	/**
	 * Look up a (potentially expired/revoked) refresh token by its hash.
	 * Validity checks (expiry/revocation) are the service's responsibility.
	 */
	findByTokenHash(
		tokenHash: string,
		options?: FindOptions<InferAttributes<RefreshToken>>
	): Promise<RefreshToken | null>

	/** Marks a refresh token as revoked, optionally recording the token that replaced it. */
	revoke(
		id: number,
		replacedById: number | null,
		transaction?: Transaction
	): Promise<void>

	/**
	 * Revokes every currently-active (non-revoked) refresh token for a user.
	 * Used as a defensive measure when a previously-revoked token is presented again,
	 * which indicates the token may have been stolen and reused.
	 */
	revokeAllActiveForUser(
		userId: number,
		transaction?: Transaction
	): Promise<number>
}
