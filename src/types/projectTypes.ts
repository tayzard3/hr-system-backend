export interface ProjectFilterOptions {
	page: number
	perPage?: number
	/** Matches against `Project.searchableFields` (code, name). */
	keyword?: string
	isActive?: boolean
	/** Exact match — `client_name` is indexed (`projects_client_name_idx`),
	 * so this stays a leading-anchored equality filter rather than a `LIKE
	 * '%...%'` scan that couldn't use the index. */
	clientName?: string
}

export interface CreateProjectDTO {
	code: string
	name: string
	description?: string | null
	clientName?: string | null
	clientEmail?: string | null
	startDate: string
	endDate?: string | null
	maxDailyHours?: number
}

export interface UpdateProjectDTO {
	code?: string
	name?: string
	description?: string | null
	clientName?: string | null
	clientEmail?: string | null
	startDate?: string
	endDate?: string | null
	maxDailyHours?: number
}

/**
 * API-facing shape of a project. Sequelize returns the `DECIMAL(4,2)`
 * `maxDailyHours` column as a string (see `src/models/Project.ts`) — this
 * DTO is where that gets parsed back into a `number` for API consumers,
 * matching the API spec's `"maxDailyHours": 8.0` example.
 */
export interface ProjectResponseDTO {
	id: number
	code: string
	name: string
	description: string | null
	clientName: string | null
	clientEmail: string | null
	startDate: string
	endDate: string | null
	maxDailyHours: number
	isActive: boolean
	createdAt: Date
	updatedAt: Date
}
