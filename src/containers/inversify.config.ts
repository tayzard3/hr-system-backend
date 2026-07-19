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

/** Service */
container.bind<IUserService>(TYPES.IUserService).to(UserService)
container.bind<IAuthService>(TYPES.IAuthService).to(AuthService)
container.bind<IRoleService>(TYPES.IRoleService).to(RoleService)
container
	.bind<IPermissionService>(TYPES.IPermissionService)
	.to(PermissionService)

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

// container.bind<boolean>('DEBUG').toConstantValue(true)

export { container }
