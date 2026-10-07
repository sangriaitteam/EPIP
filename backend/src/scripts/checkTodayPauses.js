require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})
async function run() {
  const { rows } = await pool.query(`
    SELECT ap.id, u.name, ap.reason, ap.pause_start, ap.pause_end, ap.duration_mins
    FROM attendance_pauses ap
    JOIN attendance a ON ap.attendance_id = a.id
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE a.date = CURRENT_DATE AND ap.reason = 'screen_lock'
    ORDER BY ap.pause_start DESC LIMIT 20
  `)
  rows.forEach(r => {
    console.log(`id=${r.id} user=${r.name}`)
    console.log(`  start=${new Date(r.pause_start).toLocaleTimeString('en-IN')}`)
    console.log(`  end=${r.pause_end ? new Date(r.pause_end).toLocaleTimeString('en-IN') : 'OPEN'}`)
    console.log(`  duration_mins=${r.duration_mins}`)
  })
  await pool.end()
}
run().catch(e => { console.error(e.message); process.exit(1) })
