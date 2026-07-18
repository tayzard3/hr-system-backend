/* eslint-disable no-console */
import nodemailer, { Transporter } from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import sgMail, { ClientResponse, MailDataRequired } from '@sendgrid/mail'

interface Personalization {
	to: string
	dynamicTemplateData: Record<string, unknown>
}

interface Attachment {
	content: string
	filename: string
	type?: string
	disposition?: string
	contentId?: string
}

export type GeneralEmailOptions = {
	from: {
		email: string
		name?: string
	}
	to: {
		email: string
		name?: string
	}
	attachments?: Attachment[]
	subject?: string
	ccMails?: string[]
}

export type SendGridEmailOptions = GeneralEmailOptions & {
	templateId: string
	dynamicTemplateData: { [key: string]: unknown }
}

export interface SendGridEmailType {
	to: string | string[]
	templateId: string
	ccMails?: string[]
	attachments?: Attachment[]
	personalizations?: Personalization[]
	payload: Record<string, string>
}

export class SMTPEmail {
	private smtpTransporter: Transporter<SMTPTransport.SentMessageInfo>

	constructor(config?: SMTPTransport.Options) {
		const defaultConfig: SMTPTransport.Options = {
			host: 'smtp.example.com',
			port: 587,
			secure: false, // True for port 465, false for others
			auth: {
				user: 'default-email@example.com',
				pass: 'default-password',
			},
		}

		this.smtpTransporter = nodemailer.createTransport({
			...defaultConfig,
			...config,
		})
	}

	async sendEmail(
		options: nodemailer.SendMailOptions
	): Promise<SMTPTransport.SentMessageInfo> {
		try {
			return await this.smtpTransporter.sendMail(options)
		} catch (error) {
			console.error('Error sending email:', error)
			throw error
		}
	}
}

export class SendGridEmail {
	constructor(apiKey: string) {
		sgMail.setApiKey(apiKey)
	}

	async sendEmail(
		options: MailDataRequired
	): Promise<[ClientResponse, object]> {
		try {
			return await sgMail.send(options)
		} catch (error) {
			console.error('Error sending email with SendGrid:', error)
			throw error
		}
	}
}

export default class Email {
	static SMTPEmail: typeof SMTPEmail = SMTPEmail
	static SendGridEmail: typeof SendGridEmail = SendGridEmail
}
