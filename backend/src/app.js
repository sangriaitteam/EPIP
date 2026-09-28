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
const dashboardRoutes      = require('./routes/dashboardRoutes')
const reportRoutes         = require('./routes/reportRoutes')
const screenshotRoutes     = require('./routes/screenshotRoutes')
const notificationRoutes   = require('./routes/notificationRoutes')
const adminRoutes          = require('./routes/adminRoutes')
const leaveRoutes          = require('./routes/leaveRoutes')
const projectRoutes        = require('./routes/projectRoutes')
const idCardRoutes         = require('./routes/idCardRoutes')


const app = express()

// Trust Railway/Vercel reverse proxy
app.set('trust proxy', 1)

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving uploaded files
}))

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // No origin = same-origin / curl / mobile apps / Electron agents → allow
    if (!origin) return callback(null, true)

    // Always allow configured CLIENT_URL
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true)
    }

    // Allow cloud deployments
    if (origin.endsWith('.vercel.app') || origin.endsWith('.railway.app')) {
      return callback(null, true)
    }

    // Parse the origin to check if it's a private/local network
    try {
      const url      = new URL(origin)
      const hostname = url.hostname

      // localhost / 127.x.x.x (IPv4 loopback)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return callback(null, true)
      }

      // IPv6 loopback  ::1
      if (hostname === '[::1]' || hostname === '::1') {
        return callback(null, true)
      }

      // Private IPv4 ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
      const ipv4Parts = hostname.split('.').map(Number)
      if (ipv4Parts.length === 4) {
        const [a, b] = ipv4Parts
        if (a === 10) return callback(null, true)                          // 10.0.0.0/8
        if (a === 172 && b >= 16 && b <= 31) return callback(null, true)  // 172.16.0.0/12
        if (a === 192 && b === 168) return callback(null, true)           // 192.168.0.0/16
      }

      // IPv6 link-local fe80::/10 and private fc00::/7
      const cleanIPv6 = hostname.replace(/^\[|\]$/g, '')
      if (
        cleanIPv6.toLowerCase().startsWith('fe80') ||
        cleanIPv6.toLowerCase().startsWith('fc') ||
        cleanIPv6.toLowerCase().startsWith('fd')
      ) {
        return callback(null, true)
      }
    } catch {
      // URL parse failed — block unknown origins in production
    }

    // In development — allow everything for easy local testing
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true)
    }

    callback(new Error(`CORS: ${origin} not allowed`))
  },
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
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
app.use('/api/dashboard',       dashboardRoutes)
app.use('/api/reports',         reportRoutes)
app.use('/api/screenshots',     screenshotRoutes)
app.use('/api/notifications',   notificationRoutes)
app.use('/api/admin',           adminRoutes)
app.use('/api/leaves',          leaveRoutes)
app.use('/api/projects',        projectRoutes)
app.use('/api/id-cards',        idCardRoutes)

// ── 404 / Error handlers ──────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

module.exports = app
