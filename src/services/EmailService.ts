/* eslint-disable no-console */
import { ClientResponse, MailDataRequired } from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import { SendGridEmail, SMTPEmail } from '../utils/Email'
import appConfig from '../utils/config'
import { IEmailService } from '../interfaces/service/IEmailService'
import { injectable } from 'inversify'

@injectable()
export class SendGridEmailService implements IEmailService {
	emailService: SendGridEmail

	constructor() {
		this.emailService = new SendGridEmail(appConfig.SENDGRID_API_KEY)
	}

	async send(
		emailData: MailDataRequired
	): Promise<ClientResponse | undefined> {
		const maxRetries = parseInt(appConfig.SENDGRID_RETRY) || 3
		let retryCount = 0
		while (retryCount < maxRetries) {
			try {
				const result = await this.emailService.sendEmail(emailData)
				return result[0]
			} catch (err) {
				retryCount++
			}
		}
	}
}

@injectable()
export class SMTPEmailService implements IEmailService {
	emailService: SMTPEmail

	constructor() {
		this.emailService = new SMTPEmail({
			host: 'smtp.custom.com',
			port: 465,
			secure: true,
			auth: {
				user: 'custom-user@example.com',
				pass: 'custom-pass',
			},
		})
	}

	async send(emailData: nodemailer.SendMailOptions) {
		return await this.emailService.sendEmail(emailData)
	}
}
