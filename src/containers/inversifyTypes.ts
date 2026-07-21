/**
 * Central registry of Symbols used for InversifyJS bindings.
 * Add one entry per interface as new resources are introduced —
 * never bind/inject using raw strings.
 */
export const TYPES = {
	/** Repository */
	IUserRepository: Symbol.for('IUserRepository'),
	IRoleRepository: Symbol.for('IRoleRepository'),
	IPermissionRepository: Symbol.for('IPermissionRepository'),
	IRefreshTokenRepository: Symbol.for('IRefreshTokenRepository'),
	ICountryRepository: Symbol.for('ICountryRepository'),
	ICurrencyRepository: Symbol.for('ICurrencyRepository'),
	IProjectRepository: Symbol.for('IProjectRepository'),
	IResourceRoleTypeRepository: Symbol.for('IResourceRoleTypeRepository'),
	IProjectResourceAssignmentRepository: Symbol.for(
		'IProjectResourceAssignmentRepository'
	),
	ITimesheetPeriodRepository: Symbol.for('ITimesheetPeriodRepository'),
	ITimesheetEntryRepository: Symbol.for('ITimesheetEntryRepository'),
	IRateCardRepository: Symbol.for('IRateCardRepository'),

	/** Service */
	IUserService: Symbol.for('IUserService'),
	IAuthService: Symbol.for('IAuthService'),
	IEmailService: Symbol.for('IEmailService'),
	IPasswordService: Symbol.for('IPasswordService'),
	IRoleService: Symbol.for('IRoleService'),
	IPermissionService: Symbol.for('IPermissionService'),
	ICountryService: Symbol.for('ICountryService'),
	ICurrencyService: Symbol.for('ICurrencyService'),
	IProjectService: Symbol.for('IProjectService'),
	IResourceRoleTypeService: Symbol.for('IResourceRoleTypeService'),
	IProjectResourceAssignmentService: Symbol.for(
		'IProjectResourceAssignmentService'
	),
	ITimesheetPeriodService: Symbol.for('ITimesheetPeriodService'),
	ITimesheetEntryService: Symbol.for('ITimesheetEntryService'),
	IRateCardService: Symbol.for('IRateCardService'),

	/** Controller */
	UserController: Symbol.for('UserController'),
	AuthController: Symbol.for('AuthController'),
	RoleController: Symbol.for('RoleController'),
	PermissionController: Symbol.for('PermissionController'),
	CountryController: Symbol.for('CountryController'),
	CurrencyController: Symbol.for('CurrencyController'),
	ProjectController: Symbol.for('ProjectController'),
	ResourceRoleTypeController: Symbol.for('ResourceRoleTypeController'),
	TimesheetPeriodController: Symbol.for('TimesheetPeriodController'),
	TimesheetEntryController: Symbol.for('TimesheetEntryController'),
	RateCardController: Symbol.for('RateCardController'),
}
