import { UniqueConstraintError } from 'sequelize'
import { RateCardRepository } from '../../repositories/RateCardRepository'
import { RateCard } from '../../models/RateCard'

describe('RateCardRepository.create - unique constraint passthrough', () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('propagates a raw Sequelize UniqueConstraintError unchanged (regression test for the create-path 409 mapping)', async () => {
		// Regression test for the QA-flagged defect: `BaseRepository.create`
		// catches every error and rewraps it as a plain `Error` (since
		// `UniqueConstraintError extends ValidationError`), which silently
		// broke `RateCardService.rethrowAsConflictIfUniqueConstraint`'s
		// `error instanceof UniqueConstraintError` check for `createRateCard`
		// (it already worked for `updateRateCard`, which calls
		// `rateCard.update(...)` directly and never went through
		// `BaseRepository.create`). `RateCardRepository.create` now overrides
		// the base implementation to call `RateCard.create` directly so the
		// real repository (not a mocked one) proves the original error type
		// survives.
		const repo = new RateCardRepository()
		jest
			.spyOn(RateCard, 'create')
			.mockRejectedValue(
				new UniqueConstraintError({ message: 'Duplicate entry' })
			)

		let caught: unknown
		try {
			await repo.create({
				countryId: 1,
				resourceRoleTypeId: 1,
				currencyId: 1,
				billingRate: '10.00',
				costRate: '10.00',
				effectiveDate: '2025-01-01',
				isActive: true,
			} as never)
		} catch (error) {
			caught = error
		}

		expect(caught).toBeInstanceOf(UniqueConstraintError)
	})
})
