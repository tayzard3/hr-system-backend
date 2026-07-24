import 'reflect-metadata'
import { Container } from 'inversify'
import UserRepository from '../repositories/UserRepository'
import { IUserRepository } from '../interfaces/repository/IUserRepository'
import { IUserService } from '../interfaces/service/IUserService'
import UserService from '../services/UserService'
import UserController from '../controllers/UserController'
import { TYPES } from './inversifyTypes'
import { IAuthService } from '../interfaces/service/IAuthService'
import AuthService from '../services/AuthService'
import AuthController from '../controllers/AuthController'
import { IPasswordService } from '../interfaces/repository/IPasswordService'
import { BcryptService } from '../services/PasswordService'
import { IRoleRepository } from '../interfaces/repository/IRoleRepository'
import { RoleRepository } from '../repositories/RoleRepository'
import { IRoleService } from '../interfaces/service/IRoleService'
import { RoleService } from '../services/RoleService'
import { RoleController } from '../controllers/RoleController'
import { IPermissionRepository } from '../interfaces/repository/IPermissionRepository'
import { PermissionRepository } from '../repositories/PermissionRepository'
import { IPermissionService } from '../interfaces/service/IPermissionService'
import { PermissionService } from '../services/PermissionService'
import { PermissionController } from '../controllers/PermissionController'
import { IEmailService } from '../interfaces/service/IEmailService'
import { SendGridEmailService } from '../services/EmailService'
import { IRefreshTokenRepository } from '../interfaces/repository/IRefreshTokenRepository'
import { RefreshTokenRepository } from '../repositories/RefreshTokenRepository'
import { ICountryRepository } from '../interfaces/repository/ICountryRepository'
import { CountryRepository } from '../repositories/CountryRepository'
import { ICountryService } from '../interfaces/service/ICountryService'
import { CountryService } from '../services/CountryService'
import { CountryController } from '../controllers/CountryController'
import { ICurrencyRepository } from '../interfaces/repository/ICurrencyRepository'
import { CurrencyRepository } from '../repositories/CurrencyRepository'
import { ICurrencyService } from '../interfaces/service/ICurrencyService'
import { CurrencyService } from '../services/CurrencyService'
import { CurrencyController } from '../controllers/CurrencyController'
import { IProjectRepository } from '../interfaces/repository/IProjectRepository'
import { ProjectRepository } from '../repositories/ProjectRepository'
import { IProjectService } from '../interfaces/service/IProjectService'
import { ProjectService } from '../services/ProjectService'
import { ProjectController } from '../controllers/ProjectController'
import { IResourceRoleTypeRepository } from '../interfaces/repository/IResourceRoleTypeRepository'
import { ResourceRoleTypeRepository } from '../repositories/ResourceRoleTypeRepository'
import { IResourceRoleTypeService } from '../interfaces/service/IResourceRoleTypeService'
import { ResourceRoleTypeService } from '../services/ResourceRoleTypeService'
import { ResourceRoleTypeController } from '../controllers/ResourceRoleTypeController'
import { IProjectResourceAssignmentRepository } from '../interfaces/repository/IProjectResourceAssignmentRepository'
import { ProjectResourceAssignmentRepository } from '../repositories/ProjectResourceAssignmentRepository'
import { IProjectResourceAssignmentService } from '../interfaces/service/IProjectResourceAssignmentService'
import { ProjectResourceAssignmentService } from '../services/ProjectResourceAssignmentService'
import { ITimesheetPeriodRepository } from '../interfaces/repository/ITimesheetPeriodRepository'
import { TimesheetPeriodRepository } from '../repositories/TimesheetPeriodRepository'
import { ITimesheetPeriodService } from '../interfaces/service/ITimesheetPeriodService'
import { TimesheetPeriodService } from '../services/TimesheetPeriodService'
import { TimesheetPeriodController } from '../controllers/TimesheetPeriodController'
import { ITimesheetEntryRepository } from '../interfaces/repository/ITimesheetEntryRepository'
import { TimesheetEntryRepository } from '../repositories/TimesheetEntryRepository'
import { ITimesheetEntryService } from '../interfaces/service/ITimesheetEntryService'
import { TimesheetEntryService } from '../services/TimesheetEntryService'
import { TimesheetEntryController } from '../controllers/TimesheetEntryController'
import { IRateCardRepository } from '../interfaces/repository/IRateCardRepository'
import { RateCardRepository } from '../repositories/RateCardRepository'
import { IRateCardService } from '../interfaces/service/IRateCardService'
import { RateCardService } from '../services/RateCardService'
import { RateCardController } from '../controllers/RateCardController'
import { IExchangeRateRepository } from '../interfaces/repository/IExchangeRateRepository'
import { ExchangeRateRepository } from '../repositories/ExchangeRateRepository'
import { IExchangeRateService } from '../interfaces/service/IExchangeRateService'
import { ExchangeRateService } from '../services/ExchangeRateService'
import { ExchangeRateController } from '../controllers/ExchangeRateController'
import { IInvoiceRepository } from '../interfaces/repository/IInvoiceRepository'
import { InvoiceRepository } from '../repositories/InvoiceRepository'
import { IInvoiceLineItemRepository } from '../interfaces/repository/IInvoiceLineItemRepository'
import { InvoiceLineItemRepository } from '../repositories/InvoiceLineItemRepository'
import { IInvoiceService } from '../interfaces/service/IInvoiceService'
import { InvoiceService } from '../services/InvoiceService'
import { InvoiceController } from '../controllers/InvoiceController'
import { IReportRepository } from '../interfaces/repository/IReportRepository'
import { ReportRepository } from '../repositories/ReportRepository'
import { IReportService } from '../interfaces/service/IReportService'
import { ReportService } from '../services/ReportService'
import { ReportController } from '../controllers/ReportController'

const container = new Container()

/** Bind interfaces to implementations */

/** Repository */
container.bind<IUserRepository>(TYPES.IUserRepository).to(UserRepository)
container.bind<IRoleRepository>(TYPES.IRoleRepository).to(RoleRepository)
container
	.bind<IPermissionRepository>(TYPES.IPermissionRepository)
	.to(PermissionRepository)
container
	.bind<IRefreshTokenRepository>(TYPES.IRefreshTokenRepository)
	.to(RefreshTokenRepository)
container
	.bind<ICountryRepository>(TYPES.ICountryRepository)
	.to(CountryRepository)
container
	.bind<ICurrencyRepository>(TYPES.ICurrencyRepository)
	.to(CurrencyRepository)
container
	.bind<IProjectRepository>(TYPES.IProjectRepository)
	.to(ProjectRepository)
container
	.bind<IResourceRoleTypeRepository>(TYPES.IResourceRoleTypeRepository)
	.to(ResourceRoleTypeRepository)
container
	.bind<IProjectResourceAssignmentRepository>(
		TYPES.IProjectResourceAssignmentRepository
	)
	.to(ProjectResourceAssignmentRepository)
container
	.bind<ITimesheetPeriodRepository>(TYPES.ITimesheetPeriodRepository)
	.to(TimesheetPeriodRepository)
container
	.bind<ITimesheetEntryRepository>(TYPES.ITimesheetEntryRepository)
	.to(TimesheetEntryRepository)
container
	.bind<IRateCardRepository>(TYPES.IRateCardRepository)
	.to(RateCardRepository)
container
	.bind<IExchangeRateRepository>(TYPES.IExchangeRateRepository)
	.to(ExchangeRateRepository)
container
	.bind<IInvoiceRepository>(TYPES.IInvoiceRepository)
	.to(InvoiceRepository)
container
	.bind<IInvoiceLineItemRepository>(TYPES.IInvoiceLineItemRepository)
	.to(InvoiceLineItemRepository)
container.bind<IReportRepository>(TYPES.IReportRepository).to(ReportRepository)

/** Service */
container.bind<IUserService>(TYPES.IUserService).to(UserService)
container.bind<IAuthService>(TYPES.IAuthService).to(AuthService)
container.bind<IRoleService>(TYPES.IRoleService).to(RoleService)
container
	.bind<IPermissionService>(TYPES.IPermissionService)
	.to(PermissionService)
container.bind<ICountryService>(TYPES.ICountryService).to(CountryService)
container.bind<ICurrencyService>(TYPES.ICurrencyService).to(CurrencyService)
container.bind<IProjectService>(TYPES.IProjectService).to(ProjectService)
container
	.bind<IResourceRoleTypeService>(TYPES.IResourceRoleTypeService)
	.to(ResourceRoleTypeService)
container
	.bind<IProjectResourceAssignmentService>(
		TYPES.IProjectResourceAssignmentService
	)
	.to(ProjectResourceAssignmentService)
container
	.bind<ITimesheetPeriodService>(TYPES.ITimesheetPeriodService)
	.to(TimesheetPeriodService)
container
	.bind<ITimesheetEntryService>(TYPES.ITimesheetEntryService)
	.to(TimesheetEntryService)
container.bind<IRateCardService>(TYPES.IRateCardService).to(RateCardService)
container
	.bind<IExchangeRateService>(TYPES.IExchangeRateService)
	.to(ExchangeRateService)
container.bind<IInvoiceService>(TYPES.IInvoiceService).to(InvoiceService)
container.bind<IReportService>(TYPES.IReportService).to(ReportService)

// Bind SendGridEmailService or SMTPEmailService to email service
container.bind<IEmailService>(TYPES.IEmailService).to(SendGridEmailService)
container.bind<IPasswordService>(TYPES.IPasswordService).to(BcryptService)

/** Controller */
container.bind<UserController>(TYPES.UserController).to(UserController)
container.bind<AuthController>(TYPES.AuthController).to(AuthController)
container.bind<RoleController>(TYPES.RoleController).to(RoleController)
container
	.bind<PermissionController>(TYPES.PermissionController)
	.to(PermissionController)
container.bind<CountryController>(TYPES.CountryController).to(CountryController)
container
	.bind<CurrencyController>(TYPES.CurrencyController)
	.to(CurrencyController)
container.bind<ProjectController>(TYPES.ProjectController).to(ProjectController)
container
	.bind<ResourceRoleTypeController>(TYPES.ResourceRoleTypeController)
	.to(ResourceRoleTypeController)
container
	.bind<TimesheetPeriodController>(TYPES.TimesheetPeriodController)
	.to(TimesheetPeriodController)
container
	.bind<TimesheetEntryController>(TYPES.TimesheetEntryController)
	.to(TimesheetEntryController)
container
	.bind<RateCardController>(TYPES.RateCardController)
	.to(RateCardController)
container
	.bind<ExchangeRateController>(TYPES.ExchangeRateController)
	.to(ExchangeRateController)
container.bind<InvoiceController>(TYPES.InvoiceController).to(InvoiceController)
container.bind<ReportController>(TYPES.ReportController).to(ReportController)

// container.bind<boolean>('DEBUG').toConstantValue(true)

export { container }
