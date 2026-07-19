import { Router } from 'express'
import { container } from '../../containers/inversify.config'
import { CountryController } from '../../controllers/CountryController'
import { TYPES } from '../../containers/inversifyTypes'
import { can } from '../../middlewares/permissionMiddleware'
import { COUNTRY_PERMISSION } from '../../constants'
import zodSchemaValidator from '../../validation/zodValidator'
import {
	createCountrySchema,
	updateCountrySchema,
} from '../../validation/countrySchema'

const router = Router()
const countryController = container.get<CountryController>(
	TYPES.CountryController
)

router
	.route('/')
	.get(can(COUNTRY_PERMISSION.LIST), countryController.getAllCountries)
	.post(
		can(COUNTRY_PERMISSION.CREATE),
		zodSchemaValidator(createCountrySchema),
		countryController.createCountry
	)
router
	.route('/:id')
	.get(can(COUNTRY_PERMISSION.LIST), countryController.getCountryById)
	.post(
		can(COUNTRY_PERMISSION.UPDATE),
		zodSchemaValidator(updateCountrySchema),
		countryController.updateCountry
	)
	.delete(can(COUNTRY_PERMISSION.DELETE), countryController.deleteCountry)

export default router
