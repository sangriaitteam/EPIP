// fixScreenshotUrls.js — One-time script to fix localhost URLs in screenshots table
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

async function fix() {
  // Check current state
  const before = await pool.query(
    "SELECT COUNT(*) FROM screenshots WHERE file_url LIKE '%localhost%'"
  )
  console.log('Records with localhost URL:', before.rows[0].count)

  // Update localhost → Railway URL
  const result = await pool.query(
    "UPDATE screenshots SET file_url = REPLACE(file_url, 'http://localhost:5000', 'https://epip-production-1b98.up.railway.app') WHERE file_url LIKE '%localhost%'"
  )
  console.log('Updated rows:', result.rowCount)

  // Verify
  const after = await pool.query(
    'SELECT id, file_url FROM screenshots ORDER BY id DESC LIMIT 3'
  )
  console.log('Latest URLs after fix:')
  after.rows.forEach(r => console.log(' ', r.id, '|', r.file_url))

  await pool.end()
}

fix().catch(e => { console.error(e.message); process.exit(1) })
