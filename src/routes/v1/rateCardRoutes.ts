import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { RateCardController } from '../../controllers/RateCardController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { RATE_CARD_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createRateCardSchema,
	updateRateCardSchema,
} from '../../validation/rateCardSchema'

const router = Router()
const rateCardController = container.get<RateCardController>(
	TYPES.RateCardController
)

// Must be registered before `/:id` so `lookup` isn't parsed as an `:id`.
router
	.route('/lookup')
	.get(can(RATE_CARD_PERMISSION.LIST), rateCardController.lookupRateCard)

router
	.route('/')
	.get(can(RATE_CARD_PERMISSION.LIST), rateCardController.getAllRateCards)
	.post(
		can(RATE_CARD_PERMISSION.CREATE),
		zodSchemaValidator(createRateCardSchema),
		rateCardController.createRateCard
	)
router
	.route('/:id')
	.get(can(RATE_CARD_PERMISSION.LIST), rateCardController.getRateCardById)
	.put(
		can(RATE_CARD_PERMISSION.UPDATE),
		zodSchemaValidator(updateRateCardSchema),
		rateCardController.updateRateCard
	)
	.delete(
		can(RATE_CARD_PERMISSION.DELETE),
		rateCardController.deleteRateCard
	)

export default router
