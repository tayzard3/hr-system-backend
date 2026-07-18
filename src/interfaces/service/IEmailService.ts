import { ClientResponse, MailDataRequired } from '@sendgrid/mail'
import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

export interface IEmailService {
	send(
		emailData: MailDataRequired | nodemailer.SendMailOptions
	): Promise<ClientResponse | SMTPTransport.SentMessageInfo | undefined>
}
