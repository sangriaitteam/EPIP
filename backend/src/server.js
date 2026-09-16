require('dotenv').config()
const { validateEnv } = require('./config/env')
validateEnv()

const app       = require('./app')
const { pool }  = require('./config/db')
const scheduler = require('./jobs/screenshotScheduler')

const PORT = parseInt(process.env.PORT) || 5000

const server = app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║    EPIP Backend API — Phase 1             ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`▶  Server  : http://localhost:${PORT}`)
  console.log(`▶  Health  : http://localhost:${PORT}/health`)
  console.log(`▶  Env     : ${process.env.NODE_ENV || 'development'}`)
  console.log(`▶  DB      : ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`)
  console.log('──────────────────────────────────────────')

  // Start background jobs
  if (process.env.NODE_ENV !== 'test') {
    scheduler.start()
  }
})

// ── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully…`)
  scheduler.stop()
  server.close(async () => {
    await pool.end()
    console.log('✅ Server closed. Database pool drained.')
    process.exit(0)
  })
  // Force exit after 10s
  setTimeout(() => { console.error('⚠️  Forcing exit'); process.exit(1) }, 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
process.on('uncaughtException',  err => { console.error('Uncaught Exception:', err); shutdown('uncaughtException') })
process.on('unhandledRejection', err => { console.error('Unhandled Rejection:', err) })

module.exports = server
