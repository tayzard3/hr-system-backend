import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { CurrencyController } from '../../controllers/CurrencyController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { CURRENCY_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createCurrencySchema,
	updateCurrencySchema,
} from '../../validation/currencySchema'

const router = Router()
const currencyController = container.get<CurrencyController>(
	TYPES.CurrencyController
)

router
	.route('/')
	.get(can(CURRENCY_PERMISSION.LIST), currencyController.getAllCurrencies)
	.post(
		can(CURRENCY_PERMISSION.CREATE),
		zodSchemaValidator(createCurrencySchema),
		currencyController.createCurrency
	)
router
	.route('/:id')
	.get(can(CURRENCY_PERMISSION.LIST), currencyController.getCurrencyById)
	.put(
		can(CURRENCY_PERMISSION.UPDATE),
		zodSchemaValidator(updateCurrencySchema),
		currencyController.updateCurrency
	)
	.delete(can(CURRENCY_PERMISSION.DELETE), currencyController.deleteCurrency)

export default router
