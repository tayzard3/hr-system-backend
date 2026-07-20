export const DEFAULT_ROLE = Object.freeze({
	DEVELOPER: 'Developer',
})

export const DEVELOPER_PERMISSION = Object.freeze({
	MANAGE_ALL: 'Manage_All',
})

export const USER_PERMISSION = Object.freeze({
	LIST: 'User_List',
	CREATE: 'User_Create',
	UPDATE: 'User_Update',
	DELETE: 'User_Delete',
})

export const ROLE_PERMISSION = Object.freeze({
	LIST: 'Role_List',
	CREATE: 'Role_Create',
	UPDATE: 'Role_Update',
	DELETE: 'Role_Delete',
})

export const PERMISSION_PERMISSION = Object.freeze({
	LIST: 'Permission_List',
	CREATE: 'Permission_Create',
	UPDATE: 'Permission_Update',
	DELETE: 'Permission_Delete',
})

export const COUNTRY_PERMISSION = Object.freeze({
	LIST: 'Country_List',
	CREATE: 'Country_Create',
	UPDATE: 'Country_Update',
	DELETE: 'Country_Delete',
})

export const PROJECT_PERMISSION = Object.freeze({
	LIST: 'Project_List',
	CREATE: 'Project_Create',
	UPDATE: 'Project_Update',
	DELETE: 'Project_Delete',
	ASSIGN_RESOURCE: 'Project_AssignResource',
	REMOVE_RESOURCE: 'Project_RemoveResource',
})

export const RESOURCE_ROLE_TYPE_PERMISSION = Object.freeze({
	LIST: 'ResourceRoleType_List',
	CREATE: 'ResourceRoleType_Create',
	UPDATE: 'ResourceRoleType_Update',
	DELETE: 'ResourceRoleType_Delete',
})

export const TIMESHEET_PERIOD_PERMISSION = Object.freeze({
	LIST: 'TimesheetPeriod_List',
	CREATE: 'TimesheetPeriod_Create',
	LOCK: 'TimesheetPeriod_Lock',
	UNLOCK: 'TimesheetPeriod_Unlock',
	DELETE: 'TimesheetPeriod_Delete',
})
