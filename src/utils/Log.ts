import {
	createLogger,
	transports,
	format,
	Logger,
	LoggerOptions,
} from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { ActivityLogPayload } from '../types/activityLogTypes'

type FileLogOptions = DailyRotateFile.DailyRotateFileTransportOptions

class Log {
	private static consoleInstance: Log
	private static fileInstance: Log
	private winstonLogger: Logger

	private constructor(
		logTo: 'console' | 'file' = 'console',
		options?: FileLogOptions
	) {
		const logTransports: LoggerOptions['transports'] = []

		if (logTo === 'console') {
			logTransports.push(
				new transports.Console({
					format: format.combine(format.timestamp(), format.prettyPrint()),
				})
			)
		}

		if (logTo === 'file') {
			logTransports.push(
				new DailyRotateFile({
					filename: options?.filename || 'logs/%DATE%.log',
					datePattern: options?.datePattern || 'YYYY-MM-DD',
					zippedArchive: options?.zippedArchive ?? false,
					maxSize: options?.maxSize || '20m',
					maxFiles: options?.maxFiles || '30d',
					format:
						options?.format ||
						format.combine(format.timestamp(), format.prettyPrint()),
				})
			)
		}

		this.winstonLogger = createLogger({
			level: 'info',
			transports: logTransports,
		})
	}

	static console() {
		if (!Log.consoleInstance) {
			Log.consoleInstance = new Log('console')
		}
		return Log.consoleInstance
	}

	static file(options?: FileLogOptions) {
		if (!Log.fileInstance) {
			Log.fileInstance = new Log('file', options)
		}
		return Log.fileInstance
	}

	info(message: string, meta?: object) {
		this.winstonLogger.info(message, meta)
	}

	error(message: string, meta?: object) {
		this.winstonLogger.error(message, meta)
	}

	debug(message: string, meta?: object) {
		this.winstonLogger.debug(message, meta)
	}

	activity(payload: ActivityLogPayload) {
		this.winstonLogger.info('activity', {
			log_name: payload.logName,
			description: payload.description,
			event: payload.event,
			subject_type: payload.subject.type,
			subject_id: payload.subject.id,
			causer_type: payload.causer?.type,
			causer_id: payload.causer?.id,
			properties: payload.properties,
		})
	}
}

export const AppLogger = Log.console()
export const FileLogger = Log.file()
