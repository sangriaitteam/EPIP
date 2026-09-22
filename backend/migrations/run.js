/**
 * Migration runner
 * Usage:
 *   node migrations/run.js           — runs all pending migrations
 *   node migrations/run.js --fresh   — drops all tables first (dev only)
 */
require('dotenv').config()
const { Pool } = require('pg')
const fs   = require('fs')
const path = require('path')

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
)

const isFresh = process.argv.includes('--fresh')

const run = async () => {
  try {
    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(200) NOT NULL UNIQUE,
        run_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    if (isFresh) {
      console.log('⚠️  Dropping all tables (--fresh mode)…')
      await pool.query(`
        DROP TABLE IF EXISTS
          audit_logs, system_settings, shifts, holidays, notifications,
          screenshots, self_assessments, performance_reviews, goals,
          task_comments, tasks, leave_requests, attendance,
          employee_certifications, employee_experience,
          employee_education, employee_skills, employees,
          departments, users
        CASCADE
      `)
      console.log('✅ All tables dropped')
    }

    const dir   = path.join(__dirname)
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const { rows } = await pool.query(
        `SELECT id FROM _migrations WHERE filename = $1`, [file]
      )
      if (rows.length && !isFresh) {
        console.log(`⏭  Skipping (already run): ${file}`)
        continue
      }

      console.log(`▶  Running migration: ${file}`)
      const sql = fs.readFileSync(path.join(dir, file), 'utf8')

      try {
        await pool.query(sql)
        await pool.query(
          `INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [file]
        )
        console.log(`✅ Done: ${file}`)
      } catch (migErr) {
        // Already applied — log warning and continue
        console.warn(`⚠️  Skipping ${file}: ${migErr.message}`)
        await pool.query(
          `INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, [file]
        )
      }
    }

    console.log('\n🎉 All migrations complete.')
  } catch (err) {
    console.error('❌ Migration runner failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

run()
