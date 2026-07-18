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
	type Attributes,
	type CreateOptions,
	type DestroyOptions,
	type FindOptions,
	type Model,
	type UpdateOptions,
} from 'sequelize'
import { type Col, type Fn, type Literal } from 'sequelize/types/utils'
import { PaginationResult } from '../../utils/Paginator'

export interface IBaseRepository<T extends Model> {
	findByPk(
		id: Identifier,
		options?: FindOptions<Attributes<T>>
	): Promise<T | null>

	find(options?: FindOptions<Attributes<T>>): Promise<T[]>

	findAndPaginate(
		page: number,
		perPage: number,
		options?: FindAndCountOptions<Attributes<T>>
	): Promise<PaginationResult<T>>

	findOne(options?: FindOptions<Attributes<T>>): Promise<T | null>

	findOrCreate(
		options: FindOrCreateOptions<Attributes<T>, CreationAttributes<T>>
	): Promise<[T, boolean]>

	delete(options?: DestroyOptions<Attributes<T>>): Promise<number>

	update(
		data: {
			[key in keyof Attributes<T>]?:
				| Attributes<T>[key]
				| Fn
				| Col
				| Literal
				| undefined
		},
		options: UpdateOptions<Attributes<T>>
	): Promise<[affectedCount: number, affectedRows: T[]]>

	create(
		data: CreationAttributes<T>,
		options?: CreateOptions<Attributes<T>> | undefined
	): Promise<T | undefined>

	bulkCreate(
		data: ReadonlyArray<CreationAttributes<T>>,
		options?: BulkCreateOptions<Attributes<T>>
	): Promise<T[]>

	count(
		options: Omit<CountOptions<Attributes<T>>, 'group'> | undefined
	): Promise<number>

	upsert(
		data: CreationAttributes<T>,
		options?: UpsertOptions<Attributes<T>>
	): Promise<[T, boolean | null]>

	increasement(
		fields: AllowReadonlyArray<keyof Attributes<T>>,
		options: IncrementDecrementOptionsWithBy<Attributes<T>>
	): Promise<[affectedRows: T[], affectedCount?: number | undefined]>

	decreasement(
		fields: AllowReadonlyArray<keyof Attributes<T>>,
		options: IncrementDecrementOptionsWithBy<Attributes<T>>
	): Promise<[affectedRows: T[], affectedCount?: number | undefined]>

	query<T = unknown>(
		sql: string,
		options: QueryOptionsWithType<QueryTypes>
	): Promise<T>
	//Add more common methods of sequelize
}
