import {
	ApproveTimesheetEntryResponseDTO,
	BulkApproveResultDTO,
	CreateTimesheetEntryDTO,
	TimesheetEntryCreateResponseDTO,
	TimesheetEntryDetailDTO,
	TimesheetEntryFilterOptions,
	TimesheetEntryListResultDTO,
	UpdateTimesheetEntryDTO,
} from '../../types/timesheetEntryTypes'

export interface ITimesheetEntryService {
	getAllTimesheetEntries(
		options: TimesheetEntryFilterOptions,
		currentUserId: number,
		canManageAll: boolean
	): Promise<TimesheetEntryListResultDTO>

	getTimesheetEntryById(
		id: number,
		currentUserId: number,
		canManageAll: boolean
	): Promise<TimesheetEntryDetailDTO>

	createTimesheetEntry(
		entryData: CreateTimesheetEntryDTO,
		currentUserId: number
	): Promise<TimesheetEntryCreateResponseDTO>

	updateTimesheetEntry(
		id: number,
		entryData: UpdateTimesheetEntryDTO,
		currentUserId: number
	): Promise<TimesheetEntryDetailDTO>

	deleteTimesheetEntry(
		id: number,
		currentUserId: number,
		canManageAll: boolean
	): Promise<boolean>

	approveTimesheetEntry(
		id: number,
		approvedByUserId: number
	): Promise<ApproveTimesheetEntryResponseDTO>

	unapproveTimesheetEntry(id: number): Promise<void>

	bulkApproveTimesheetEntries(
		entryIds: number[],
		approvedByUserId: number
	): Promise<BulkApproveResultDTO>
}
