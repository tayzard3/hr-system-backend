export type ActivityLogPayload = {
	logName: string
	description: string
	event: 'created' | 'updated' | 'deleted' | string
	subject: {
		type: string
		id: number
	}
	causer?: {
		type: string
		id?: number | null
	}
	properties?: {
		before?: Record<string, unknown>
		after?: Record<string, unknown>
	}
}
