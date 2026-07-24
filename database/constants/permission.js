"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVOICE_PERMISSION = exports.EXCHANGE_RATE_PERMISSION = exports.RATE_CARD_PERMISSION = exports.TIMESHEET_ENTRY_PERMISSION = exports.TIMESHEET_PERIOD_PERMISSION = exports.CURRENCY_PERMISSION = exports.RESOURCE_ROLE_TYPE_PERMISSION = exports.PROJECT_PERMISSION = exports.COUNTRY_PERMISSION = exports.PERMISSION_PERMISSION = exports.ROLE_PERMISSION = exports.USER_PERMISSION = exports.DEVELOPER_PERMISSION = exports.DEFAULT_ROLE = void 0;
exports.REPORT_PERMISSION = exports.EXCHANGE_RATE_PERMISSION = exports.RATE_CARD_PERMISSION = exports.TIMESHEET_ENTRY_PERMISSION = exports.TIMESHEET_PERIOD_PERMISSION = exports.CURRENCY_PERMISSION = exports.RESOURCE_ROLE_TYPE_PERMISSION = exports.PROJECT_PERMISSION = exports.COUNTRY_PERMISSION = exports.PERMISSION_PERMISSION = exports.ROLE_PERMISSION = exports.USER_PERMISSION = exports.DEVELOPER_PERMISSION = exports.DEFAULT_ROLE = void 0;
exports.DEFAULT_ROLE = Object.freeze({
    DEVELOPER: 'Developer',
});
exports.DEVELOPER_PERMISSION = Object.freeze({
    MANAGE_ALL: 'Manage_All',
});
exports.USER_PERMISSION = Object.freeze({
    LIST: 'User_List',
    CREATE: 'User_Create',
    UPDATE: 'User_Update',
    DELETE: 'User_Delete',
});
exports.ROLE_PERMISSION = Object.freeze({
    LIST: 'Role_List',
    CREATE: 'Role_Create',
    UPDATE: 'Role_Update',
    DELETE: 'Role_Delete',
});
exports.PERMISSION_PERMISSION = Object.freeze({
    LIST: 'Permission_List',
    CREATE: 'Permission_Create',
    UPDATE: 'Permission_Update',
    DELETE: 'Permission_Delete',
});
exports.COUNTRY_PERMISSION = Object.freeze({
    LIST: 'Country_List',
    CREATE: 'Country_Create',
    UPDATE: 'Country_Update',
    DELETE: 'Country_Delete',
});
exports.PROJECT_PERMISSION = Object.freeze({
    LIST: 'Project_List',
    CREATE: 'Project_Create',
    UPDATE: 'Project_Update',
    DELETE: 'Project_Delete',
    ASSIGN_RESOURCE: 'Project_AssignResource',
    REMOVE_RESOURCE: 'Project_RemoveResource',
});
exports.RESOURCE_ROLE_TYPE_PERMISSION = Object.freeze({
    LIST: 'ResourceRoleType_List',
    CREATE: 'ResourceRoleType_Create',
    UPDATE: 'ResourceRoleType_Update',
    DELETE: 'ResourceRoleType_Delete',
});
exports.CURRENCY_PERMISSION = Object.freeze({
    LIST: 'Currency_List',
    CREATE: 'Currency_Create',
    UPDATE: 'Currency_Update',
    DELETE: 'Currency_Delete',
});
exports.TIMESHEET_PERIOD_PERMISSION = Object.freeze({
    LIST: 'TimesheetPeriod_List',
    CREATE: 'TimesheetPeriod_Create',
    LOCK: 'TimesheetPeriod_Lock',
    UNLOCK: 'TimesheetPeriod_Unlock',
    DELETE: 'TimesheetPeriod_Delete',
});
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
exports.TIMESHEET_ENTRY_PERMISSION = Object.freeze({
    LIST: 'TimesheetEntry_List',
    CREATE: 'TimesheetEntry_Create',
    UPDATE: 'TimesheetEntry_Update',
    DELETE: 'TimesheetEntry_Delete',
    APPROVE: 'TimesheetEntry_Approve',
    UNAPPROVE: 'TimesheetEntry_Unapprove',
    MANAGE_ALL: 'TimesheetEntry_ManageAll',
});
/**
 * `LIST` backs `GetAllRateCards`/`GetRateCardById`/`LookupRateCard` — per
 * the API spec's RBAC matrix, Rate Cards are read-only for `ProjectAdmin`
 * and fully writable only for `SystemAdmin` (same "one LIST permission
 * shared by every read endpoint" convention as `CURRENCY_PERMISSION`).
 * Which role(s) get which permission is a data/seeding decision — see the
 * note on `TIMESHEET_ENTRY_PERMISSION` above.
 */
exports.RATE_CARD_PERMISSION = Object.freeze({
    LIST: 'RateCard_List',
    CREATE: 'RateCard_Create',
    UPDATE: 'RateCard_Update',
    DELETE: 'RateCard_Delete',
});
/**
 * `LIST` backs `GetAllExchangeRates`/`GetExchangeRateById` — per the API
 * spec's RBAC matrix, Exchange Rates are read-only for `ProjectAdmin` and
 * fully writable only for `SystemAdmin` (same "one LIST permission shared by
 * every read endpoint" convention as `RATE_CARD_PERMISSION`). Which role(s)
 * get which permission is a data/seeding decision — see the note on
 * `TIMESHEET_ENTRY_PERMISSION` above.
 *
 * `GetLatestExchangeRate` is intentionally NOT gated by any of these: the API
 * spec documents its `Auth` as "Any authenticated user" (unlike
 * `LookupRateCard`, which the spec restricts to `ProjectAdmin`/`SystemAdmin`)
 * — see `exchangeRateRoutes.ts`.
 */
exports.EXCHANGE_RATE_PERMISSION = Object.freeze({
    LIST: 'ExchangeRate_List',
    CREATE: 'ExchangeRate_Create',
    UPDATE: 'ExchangeRate_Update',
    DELETE: 'ExchangeRate_Delete',
});
/**
 * One permission per action (rather than a single shared `MANAGE`), matching
 * the API spec's RBAC matrix distinguishing "Invoice GenerateInvoice + Manage"
 * (ProjectAdmin + SystemAdmin) from `DeleteInvoice`/`VoidInvoice` (the spec's
 * per-endpoint `Auth` column restricts those two to `SystemAdmin` only). Which
 * role(s) get which permission is a data/seeding decision — see the note on
 * `TIMESHEET_ENTRY_PERMISSION` above.
 */
exports.INVOICE_PERMISSION = Object.freeze({
    LIST: 'Invoice_List',
    GENERATE: 'Invoice_Generate',
    UPDATE: 'Invoice_Update',
    DELETE: 'Invoice_Delete',
    SEND: 'Invoice_Send',
    MARK_PAID: 'Invoice_MarkPaid',
    VOID: 'Invoice_Void',
    CANCEL: 'Invoice_Cancel',
    DOWNLOAD_PDF: 'Invoice_DownloadPdf',
 * Per the API spec's RBAC matrix, all of Module 5 (`GenerateTimesheetReport`,
 * `GenerateUserRolesSummary`, `GenerateMonthlyCostRevenue` and their `Export*`
 * counterparts) is `ProjectAdmin`/`SystemAdmin`-only with no partial/"own
 * data" access for `User` (unlike `TIMESHEET_ENTRY_PERMISSION`, which splits
 * "own" vs "all"). `VIEW` backs the three `Generate*` (on-screen) endpoints;
 * `EXPORT` backs the three `Export*` (file-download) endpoints — split into
 * two permissions rather than one shared `LIST` since exporting is a
 * meaningfully different (and potentially more sensitive, data-exfiltration-
 * adjacent) action than viewing on-screen. Which role(s) get which permission
 * is a data/seeding decision — see the note on `TIMESHEET_ENTRY_PERMISSION`
 * above.
 */
exports.REPORT_PERMISSION = Object.freeze({
    VIEW: 'Report_View',
    EXPORT: 'Report_Export',
});
//# sourceMappingURL=permission.js.map