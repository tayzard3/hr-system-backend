export interface AssignResourceDTO {
	userId: number
	resourceRoleTypeId: number
}

export interface ProjectAssignmentFilterOptions {
	/** Filter by `is_active` — omit to return both active and inactive rows. */
	isActive?: boolean
}

/**
 * Shape returned by `AssignResource` — mirrors the API spec's flat
 * `{ id, projectId, userId, resourceRoleTypeId, assignedAt, isActive }`
 * response (no nested associations needed here).
 */
export interface ProjectAssignmentResponseDTO {
	id: number
	projectId: number
	userId: number
	resourceRoleTypeId: number
	assignedAt: Date
	isActive: boolean
}

export interface ProjectAssignmentUserDTO {
	id: number
	fullName: string
	email: string
}

export interface ProjectAssignmentResourceRoleTypeDTO {
	id: number
	name: string
}

/**
 * Shape returned by `GetProjectAssignments` — includes the nested `user`
 * and `resourceRoleType` summaries the API spec's response example shows.
 */
export interface ProjectAssignmentListItemDTO {
	id: number
	user: ProjectAssignmentUserDTO
	resourceRoleType: ProjectAssignmentResourceRoleTypeDTO
	assignedAt: Date
	isActive: boolean
}
