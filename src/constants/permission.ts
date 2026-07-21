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

export const CURRENCY_PERMISSION = Object.freeze({
	LIST: 'Currency_List',
	CREATE: 'Currency_Create',
	UPDATE: 'Currency_Update',
	DELETE: 'Currency_Delete',
})

export const TIMESHEET_PERIOD_PERMISSION = Object.freeze({
	LIST: 'TimesheetPeriod_List',
	CREATE: 'TimesheetPeriod_Create',
	LOCK: 'TimesheetPeriod_Lock',
	UNLOCK: 'TimesheetPeriod_Unlock',
	DELETE: 'TimesheetPeriod_Delete',
})

/**
 * `MANAGE_ALL` backs the "admins see/manage everyone's entries, regular
 * users are scoped to their own" split the API spec calls out for
 * `GetAllTimesheetEntries`/`GetTimesheetEntryById`/`DeleteTimesheetEntry`
 * (TS-03, TS-06). It is checked via `req.ability.can('ManageAll',
 * 'TimesheetEntry')` in the controller (same "compute a boolean off
 * `req` in the controller, pass it into the service" pattern as
 * `RoleController.getAllRoles`'s `isDeveloper` flag) rather than
 * hard-coding role names — this codebase has no seeded `SystemAdmin`/
 * `ProjectAdmin` roles yet (only `Developer`), so which role(s) get this
 * permission is a data/seeding decision, not a code one.
 */
export const TIMESHEET_ENTRY_PERMISSION = Object.freeze({
	LIST: 'TimesheetEntry_List',
	CREATE: 'TimesheetEntry_Create',
	UPDATE: 'TimesheetEntry_Update',
	DELETE: 'TimesheetEntry_Delete',
	APPROVE: 'TimesheetEntry_Approve',
	UNAPPROVE: 'TimesheetEntry_Unapprove',
	MANAGE_ALL: 'TimesheetEntry_ManageAll',
})
