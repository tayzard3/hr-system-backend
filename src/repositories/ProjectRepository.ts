import { injectable } from 'inversify'
import { Project } from '../models/Project'
import { IProjectRepository } from '../interfaces/repository/IProjectRepository'
import { BaseRepository } from './BaseRepository'

@injectable()
export class ProjectRepository
	extends BaseRepository<Project>
	implements IProjectRepository
{
	constructor() {
		super(Project)
	}

	public async findByCode(code: string): Promise<Project | null> {
		return this.model.findOne({ where: { code } })
	}
}
