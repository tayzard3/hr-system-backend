import dns from 'dns'
dns.setDefaultResultOrder('ipv4first')

import 'dotenv/config'
import './src/utils/config'
import 'reflect-metadata'
import express, { Application } from 'express'
import { globalErrorHandler } from './src/utils/globalErrorHandler'
import { sendApiResponse } from './src/utils/responseHandler'
import { timingMiddleware } from './src/middlewares/timingMiddleware'
import http from 'http'
import moment from 'moment-timezone'
import { sequelize } from './src/models'
import appConfig from './src/utils/config'
import cors from 'cors'
import routes from './src/routes/index'
import path from 'path'
import { AppLogger } from './src/utils/Log'

const corsOptions = {
	origin: '*', // Replace with your app's origin
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	exposedHeaders: ['Content-Disposition'],
}

sequelize
	.authenticate()
	.then(() => {
		AppLogger.info('Connection has been established successfully.')
	})
	.catch((err) => {
		AppLogger.info(`Unable to connect to the database:  ${err.message}`)
		process.exit(1)
	})

const app: Application = express()
moment.tz.setDefault(appConfig.TIME_ZONE)
app.use(express.json())

app.use(cors(corsOptions))
app.use(timingMiddleware)
app.use('/uploads', express.static(path.join(__dirname, './public/uploads')))

app.get('/_health', (req, res) => {
	res.status(200).send('ok')
})

app.use('/api', routes)

app.use((req, res) => {
	sendApiResponse(res, 404, `Route not found: ${req.method} ${req.originalUrl}`)
})

app.use(globalErrorHandler)

const port = appConfig.SERVER_PORT || 3000

const server = http.createServer(app)

server.listen(port, () => {
	AppLogger.info(`Server is running at port ${port}`)
})
