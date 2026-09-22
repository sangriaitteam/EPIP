const { Pool } = require('pg')

// Supabase / production: use DATABASE_URL connection string
// Local dev: use individual DB_* env vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Supabase
      max:                     10,
      min:                      2,
      idleTimeoutMillis:    60000,
      connectionTimeoutMillis: 5000,
      keepAlive:             true,
      keepAliveInitialDelayMillis: 10000,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'epip_db',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max:                     10,
      min:                      2,
      idleTimeoutMillis:    60000,
      connectionTimeoutMillis: 5000,
      keepAlive:             true,
      keepAliveInitialDelayMillis: 10000,
    }

const pool = new Pool(poolConfig)

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message)
    return
  }
  console.log('✅ PostgreSQL connected successfully')
  release()
})

// Handle unexpected pool errors — reconnect automatically
pool.on('error', (err) => {
  if (err.code === 'ECONNRESET' || err.message.includes('timeout') || err.message.includes('terminated')) {
    console.warn('⚠️  DB connection dropped — pool will reconnect automatically')
  } else {
    console.error('Unexpected database error:', err.message)
  }
})

// Keep-alive: ping DB every 4 minutes to prevent idle timeout
setInterval(async () => {
  try {
    await pool.query('SELECT 1')
  } catch {
    // silent — pool handles reconnect
  }
}, 4 * 60 * 1000)

/**
 * Execute a query with automatic retry on connection error
 */
const query = async (text, params) => {
  try {
    return await pool.query(text, params)
  } catch (err) {
    if (err.code === 'ECONNRESET' || err.message.includes('timeout') || err.message.includes('terminated')) {
      // Retry once after brief delay
      await new Promise(r => setTimeout(r, 500))
      return await pool.query(text, params)
    }
    throw err
  }
}

/**
 * Get a client from the pool (for transactions)
 */
const getClient = () => pool.connect()

module.exports = { query, getClient, pool }
