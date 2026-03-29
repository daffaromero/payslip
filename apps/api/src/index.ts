import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { authMiddleware } from './middleware/auth'
import { startCronJobs } from './routes/cron'

import authRouter from './routes/auth'
import employeesRouter from './routes/employees'
import companyRouter from './routes/company'
import templatesRouter from './routes/templates'
import payslipsRouter from './routes/payslips'
import generateRouter from './routes/generate'
import importRouter from './routes/import'
import whatsappRouter from './routes/whatsapp'
import uploadsRouter from './routes/uploads'
import usersRouter from './routes/users'
import seedRouter from './routes/seed'
import healthRouter from './routes/health'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}))
app.use('*', authMiddleware)

app.route('/api/health', healthRouter)
app.route('/api/auth', authRouter)
app.route('/api/employees', employeesRouter)
app.route('/api/company', companyRouter)
app.route('/api/templates', templatesRouter)
app.route('/api/payslips', payslipsRouter)
app.route('/api', generateRouter)
app.route('/api/import-excel', importRouter)
app.route('/api/whatsapp', whatsappRouter)
app.route('/api/uploads', uploadsRouter)
app.route('/api/users', usersRouter)
app.route('/api/seed', seedRouter)

const port = Number(process.env.PORT ?? 3001)

startCronJobs()

export default {
  port,
  fetch: app.fetch,
}
