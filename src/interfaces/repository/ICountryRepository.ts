import { Country } from '../../models/Country'
import { IBaseRepository } from './IBaseRepository'

export interface ICountryRepository extends IBaseRepository<Country> {
	findByCode(code: string): Promise<Country | null>
}
