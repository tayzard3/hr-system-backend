import { injectable } from 'inversify'
import { Country } from '../models/Country'
import { ICountryRepository } from '../interfaces/repository/ICountryRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class CountryRepository
	extends BaseRepository<Country>
	implements ICountryRepository
{
	constructor() {
		super(Country)
	}

	public async findByCode(code: string): Promise<Country | null> {
		return this.model.findOne({ where: { code } })
	}
}
