import { Project } from '../../models/Project'
import { IBaseRepository } from './IBaseRepository'

export interface IProjectRepository extends IBaseRepository<Project> {
	findByCode(code: string): Promise<Project | null>
}
