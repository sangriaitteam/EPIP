 require('dotenv').config()

const express     = require('express')
const cors        = require('cors')
const helmet      = require('helmet')
const compression = require('compression')
const morgan      = require('morgan')
const rateLimit   = require('express-rate-limit')
const path        = require('path')

const { errorHandler, notFound } = require('./middleware/errorHandler')

// ── Route imports ─────────────────────────────────────────────────────────
const authRoutes           = require('./routes/authRoutes')
const employeeRoutes       = require('./routes/employeeRoutes')
const attendanceRoutes     = require('./routes/attendanceRoutes')
const taskRoutes           = require('./routes/taskRoutes')
const goalRoutes           = require('./routes/goalRoutes')
const performanceRoutes    = require('./routes/performanceRoutes')
const selfAssessmentRoutes = require('./routes/selfAssessmentRoutes')
const dashboardRoutes      = require('./routes/dashboardRoutes')
const reportRoutes         = require('./routes/reportRoutes')
const screenshotRoutes     = require('./routes/screenshotRoutes')
const notificationRoutes   = require('./routes/notificationRoutes')
const adminRoutes          = require('./routes/adminRoutes')
const leaveRoutes          = require('./routes/leaveRoutes')
const projectRoutes        = require('./routes/projectRoutes')
const dailyReportRoutes    = require('./routes/dailyReportRoutes')

const app = express()

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded files
}))

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow all localhost origins (any port) + configured CLIENT_URL
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://127.0.0.1:5173',
      process.env.CLIENT_URL,
    ].filter(Boolean)

    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: ${origin} not allowed`))
    }
  },
  credentials: true,
  methods:      ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

// ── Rate limiting ─────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many login attempts, please try again in 15 minutes' },
})

app.use('/api/', limiter)
app.use('/api/auth/login', authLimiter)

// ── Request parsing ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(compression())

// ── Logger ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ── Static uploads ────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads')
app.use('/uploads', express.static(UPLOAD_DIR))

// ── Health check ─────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({
    status:      'ok',
    service:     'EPIP Backend API',
    version:     '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString(),
  })
)

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes)
app.use('/api/employees',       employeeRoutes)
app.use('/api/attendance',      attendanceRoutes)
app.use('/api/tasks',           taskRoutes)
app.use('/api/goals',           goalRoutes)
app.use('/api/performance',     performanceRoutes)
app.use('/api/self-assessment', selfAssessmentRoutes)
app.use('/api/dashboard',       dashboardRoutes)
app.use('/api/reports',         reportRoutes)
app.use('/api/screenshots',     screenshotRoutes)
app.use('/api/notifications',   notificationRoutes)
app.use('/api/admin',           adminRoutes)
app.use('/api/leaves',          leaveRoutes)
app.use('/api/projects',        projectRoutes)
app.use('/api/daily-reports',   dailyReportRoutes)

// ── 404 / Error handlers ──────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

module.exports = app
