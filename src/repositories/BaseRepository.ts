import {
	AllowReadonlyArray,
	BulkCreateOptions,
	CountOptions,
	CreationAttributes,
	FindAndCountOptions,
	FindOrCreateOptions,
	Identifier,
	IncrementDecrementOptionsWithBy,
	QueryOptionsWithType,
	QueryTypes,
	UpsertOptions,
	ValidationError,
	type Attributes,
	type CreateOptions,
	type DestroyOptions,
	type FindOptions,
	type Model,
	type ModelStatic,
	type UpdateOptions,
} from 'sequelize'
import { type Col, type Fn, type Literal } from 'sequelize/types/utils'
import { PaginationResult, Paginator } from '../utils/Paginator'

export abstract class BaseRepository<T extends Model> {
	constructor(protected model: ModelStatic<T>) {}

	async findByPk(
		id: Identifier,
		options?: Omit<FindOptions<Attributes<T>>, 'where'>
	): Promise<T | null> {
		return await this.model.findByPk(id, options)
	}

	async find(options?: FindOptions<Attributes<T>>): Promise<T[]> {
		return await this.model.findAll(options)
	}

	async findAndPaginate(
		page: number,
		perPage: number,
		options?: FindAndCountOptions<Attributes<T>>
	): Promise<PaginationResult<T>> {
		const paginator = new Paginator(this.model, page, perPage)
		return paginator.paginate(options)
	}

	async findOne(options?: FindOptions<Attributes<T>>): Promise<T | null> {
		return await this.model.findOne(options)
	}

	async findOrCreate(
		options: FindOrCreateOptions<Attributes<T>, CreationAttributes<T>>
	): Promise<[T, boolean]> {
		return await this.model.findOrCreate(options)
	}

	async delete(options?: DestroyOptions<Attributes<T>>): Promise<number> {
		return await this.model.destroy(options)
	}

	async update(
		data: {
			[key in keyof Attributes<T>]?:
				| Attributes<T>[key]
				| Fn
				| Col
				| Literal
				| undefined
		},
		options: Omit<UpdateOptions<Attributes<T>>, 'returning'> & {
			returning: Exclude<
				UpdateOptions<Attributes<T>>['returning'],
				undefined | false
			>
		}
	): Promise<[affectedCount: number, affectedRows: T[]]> {
		return await this.model.update(data, options)
	}

	async create(
		data: CreationAttributes<T>,
		options?: CreateOptions<Attributes<T>> | undefined
	): Promise<T | undefined> {
		try {
			return await this.model.create(data, options)
		} catch (error) {
			const errorMsg = `Unable to create ${this.model.name}. ${error}`
			if (error instanceof ValidationError) {
				throw new Error(error.errors.at(0)?.message || errorMsg)
			} else {
				throw new Error(errorMsg)
			}
		}
	}

	async bulkCreate(
		data: ReadonlyArray<CreationAttributes<T>>,
		options?: BulkCreateOptions<Attributes<T>>
	): Promise<T[]> {
		return await this.model.bulkCreate(data, options)
	}

	async count(
		options: Omit<CountOptions<Attributes<T>>, 'group'> | undefined
	): Promise<number> {
		return await this.model.count(options)
	}

	async upsert(
		data: CreationAttributes<T>,
		options?: UpsertOptions<Attributes<T>>
	): Promise<[T, boolean | null]> {
		return await this.model.upsert(data, options)
	}

	async increasement(
		fields: AllowReadonlyArray<keyof Attributes<T>>,
		options: IncrementDecrementOptionsWithBy<Attributes<T>>
	): Promise<[affectedRows: T[], affectedCount?: number | undefined]> {
		return await this.model.increment(fields, options)
	}

	async decreasement(
		fields: AllowReadonlyArray<keyof Attributes<T>>,
		options: IncrementDecrementOptionsWithBy<Attributes<T>>
	): Promise<[affectedRows: T[], affectedCount?: number | undefined]> {
		return await this.model.decrement(fields, options)
	}

	async query<T = unknown>(
		sql: string,
		options: QueryOptionsWithType<QueryTypes>
	): Promise<T> {
		return (await this.model.sequelize!.query(sql, options)) as T
	}
}
