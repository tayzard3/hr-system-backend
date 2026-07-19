import {
	CreateProjectDTO,
	ProjectFilterOptions,
	ProjectResponseDTO,
	UpdateProjectDTO,
} from '../../types/projectTypes'
import { PaginationResult } from '../../utils/Paginator'

export interface IProjectService {
	createProject(projectData: CreateProjectDTO): Promise<ProjectResponseDTO>
	getAllProjects(
		options: ProjectFilterOptions
	): Promise<PaginationResult<ProjectResponseDTO> | ProjectResponseDTO[]>
	getProjectById(id: number): Promise<ProjectResponseDTO>
	updateProject(
		id: number,
		projectData: UpdateProjectDTO
	): Promise<ProjectResponseDTO | null>
	deleteProject(id: number): Promise<boolean>
}
