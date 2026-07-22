import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { ExchangeRateController } from '../../controllers/ExchangeRateController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { EXCHANGE_RATE_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createExchangeRateSchema,
	updateExchangeRateSchema,
} from '../../validation/exchangeRateSchema'

const router = Router()
const exchangeRateController = container.get<ExchangeRateController>(
	TYPES.ExchangeRateController
)

// Must be registered before `/:id` so `latest` isn't parsed as an `:id`.
// No `can(...)` gate here — the API spec documents `GetLatestExchangeRate`'s
// `Auth` as "Any authenticated user" (`protect`, applied where this router is
// mounted, is sufficient), unlike every other endpoint below.
router.route('/latest').get(exchangeRateController.getLatestExchangeRate)

router
	.route('/')
	.get(
		can(EXCHANGE_RATE_PERMISSION.LIST),
		exchangeRateController.getAllExchangeRates
	)
	.post(
		can(EXCHANGE_RATE_PERMISSION.CREATE),
		zodSchemaValidator(createExchangeRateSchema),
		exchangeRateController.createExchangeRate
	)
router
	.route('/:id')
	.get(
		can(EXCHANGE_RATE_PERMISSION.LIST),
		exchangeRateController.getExchangeRateById
	)
	.put(
		can(EXCHANGE_RATE_PERMISSION.UPDATE),
		zodSchemaValidator(updateExchangeRateSchema),
		exchangeRateController.updateExchangeRate
	)
	.delete(
		can(EXCHANGE_RATE_PERMISSION.DELETE),
		exchangeRateController.deleteExchangeRate
	)

export default router
