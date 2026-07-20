import {
	CreateTimesheetPeriodDTO,
	TimesheetPeriodFilterOptions,
	TimesheetPeriodResponseDTO,
} from '../../types/timesheetPeriodTypes'

export interface ITimesheetPeriodService {
	getAllTimesheetPeriods(
		options: TimesheetPeriodFilterOptions
	): Promise<TimesheetPeriodResponseDTO[]>
	getTimesheetPeriodById(id: number): Promise<TimesheetPeriodResponseDTO>
	createTimesheetPeriod(
		periodData: CreateTimesheetPeriodDTO
	): Promise<TimesheetPeriodResponseDTO>
	lockTimesheetPeriod(
		id: number,
		lockedByUserId: number
	): Promise<TimesheetPeriodResponseDTO>
	unlockTimesheetPeriod(id: number): Promise<TimesheetPeriodResponseDTO>
	deleteTimesheetPeriod(id: number): Promise<boolean>
}
