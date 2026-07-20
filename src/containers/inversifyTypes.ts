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
	IProjectRepository: Symbol.for('IProjectRepository'),

	/** Service */
	IUserService: Symbol.for('IUserService'),
	IAuthService: Symbol.for('IAuthService'),
	IEmailService: Symbol.for('IEmailService'),
	IPasswordService: Symbol.for('IPasswordService'),
	IRoleService: Symbol.for('IRoleService'),
	IPermissionService: Symbol.for('IPermissionService'),
	ICountryService: Symbol.for('ICountryService'),
	IProjectService: Symbol.for('IProjectService'),

	/** Controller */
	UserController: Symbol.for('UserController'),
	AuthController: Symbol.for('AuthController'),
	RoleController: Symbol.for('RoleController'),
	PermissionController: Symbol.for('PermissionController'),
	CountryController: Symbol.for('CountryController'),
	ProjectController: Symbol.for('ProjectController'),
}
