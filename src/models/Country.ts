'use strict'
import {
	Model,
	DataTypes,
	ModelStatic,
	Sequelize,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
} from 'sequelize'

export class Country extends Model<
	InferAttributes<Country>,
	InferCreationAttributes<Country>
> {
	declare id: CreationOptional<number>
	declare code: string
	declare name: string
	declare createdAt: CreationOptional<Date>
	declare updatedAt: CreationOptional<Date>
	declare deletedAt: CreationOptional<Date | null>

	// Define searchable fields
	static searchableFields = ['code', 'name']
}

export function initCountry(sequelize: Sequelize): typeof Country {
	Country.init(
		{
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			code: {
				type: DataTypes.STRING(2),
				allowNull: false,
				unique: true,
			},
			name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			createdAt: {
				allowNull: false,
				type: DataTypes.DATE,
				field: 'created_at',
			},
			updatedAt: {
				allowNull: false,
				type: DataTypes.DATE,
				field: 'updated_at',
			},
			deletedAt: {
				allowNull: true,
				type: DataTypes.DATE,
				field: 'deleted_at',
			},
		},
		{
			sequelize,
			modelName: 'Country',
			tableName: 'countries',
			paranoid: true, // Enable soft delete support
			timestamps: true,
			underscored: true,
		}
	)
	return Country
}

export type CountryModel = ModelStatic<Country>
