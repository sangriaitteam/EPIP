// One-time script: rename project "3D Models" → "CBT"
require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function run() {
  const { rowCount } = await pool.query(
    `UPDATE projects SET name = 'CBT' WHERE name = '3D Models'`
  )
  console.log(`Updated ${rowCount} project(s) — "3D Models" → "CBT"`)
  await pool.end()
}

run().catch(err => { console.error(err); process.exit(1) })
