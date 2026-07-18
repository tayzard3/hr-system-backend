/* eslint-disable @typescript-eslint/no-unused-vars */
import { Model, FindAndCountOptions, ModelStatic } from 'sequelize'

export interface PaginateOptions {
	page: number
	perPage: number
}

export interface PaginationResult<T> {
	data: T[]
	currentPage?: number
	perPage: number
	totalResults?: number
	totalPages?: number
	hasPreviousPage?: boolean
	hasNextPage?: boolean
	total: number
}

export class Paginator<T extends Model> {
	private model: ModelStatic<T>
	private currentPage: number
	private perPage: number

	constructor(
		model: ModelStatic<T>,
		currentPage: number = 1,
		perPage: number = 10
	) {
		this.model = model
		this.perPage = perPage
		this.currentPage = currentPage
	}

	public async paginate(
		options: FindAndCountOptions = {}
	): Promise<PaginationResult<T>> {
		const offset = (this.currentPage - 1) * this.perPage
		const limit = this.perPage

		const { attributes, ...countOptions } = options

		try {
			if (!limit) {
				const data = await this.model.findAll({
					...options,
				})

				return {
					data,
					currentPage: 1,
					perPage: data.length,
					totalResults: data.length,
					totalPages: 1,
					hasPreviousPage: false,
					hasNextPage: false,
					total: data.length,
				}
			} else {
				const [totalResults, data] = await Promise.all([
					this.model.count(countOptions),
					this.model.findAll({
						...options,
						offset,
						limit,
					}),
				])

				const totalPages = Math.ceil(totalResults / this.perPage)

				return {
					data,
					currentPage: this.currentPage,
					perPage: this.perPage,
					totalResults,
					totalPages,
					hasPreviousPage: this.currentPage > 1,
					hasNextPage: this.currentPage < totalPages,
					total: totalResults,
				}
			}
		} catch (error) {
			throw new Error(`Pagination failed: ${error}`)
		}
	}
}
