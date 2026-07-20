import {
	AssignResourceDTO,
	ProjectAssignmentFilterOptions,
	ProjectAssignmentListItemDTO,
	ProjectAssignmentResponseDTO,
} from '../../types/projectResourceAssignmentTypes'

export interface IProjectResourceAssignmentService {
	getProjectAssignments(
		projectId: number,
		options: ProjectAssignmentFilterOptions
	): Promise<ProjectAssignmentListItemDTO[]>
	assignResource(
		projectId: number,
		data: AssignResourceDTO
	): Promise<ProjectAssignmentResponseDTO>
	removeResource(projectId: number, assignmentId: number): Promise<boolean>
}
