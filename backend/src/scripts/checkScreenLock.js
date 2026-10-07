require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD })

async function run() {
  // Get today's screen_lock pauses for all employees
  const { rows } = await pool.query(`
    SELECT 
      ap.id, u.name, ap.reason,
      ap.pause_start AT TIME ZONE 'Asia/Kolkata' AS start_ist,
      ap.pause_end   AT TIME ZONE 'Asia/Kolkata' AS end_ist,
      ap.duration_mins,
      es.login_at    AT TIME ZONE 'Asia/Kolkata' AS session_login_ist
    FROM attendance_pauses ap
    JOIN attendance a ON ap.attendance_id = a.id
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    LEFT JOIN employee_sessions es ON es.attendance_id = a.id 
      AND es.employee_id = a.employee_id
      AND es.logout_at IS NULL
    WHERE a.date = CURRENT_DATE
      AND ap.reason = 'screen_lock'
    ORDER BY ap.pause_start DESC
    LIMIT 20
  `)
  
  console.log('=== Today screen_lock pauses ===')
  rows.forEach(r => {
    console.log(`id=${r.id} user=${r.name}`)
    console.log(`  start=${r.start_ist?.toLocaleTimeString('en-IN')}`)
    console.log(`  end=${r.end_ist ? r.end_ist.toLocaleTimeString('en-IN') : 'OPEN'}`)
    console.log(`  duration_mins=${r.duration_mins}`)
    console.log(`  session_login=${r.session_login_ist?.toLocaleTimeString('en-IN')}`)
    console.log(`  before_session=${r.session_login_ist && r.start_ist < r.session_login_ist ? 'YES (pre-session)' : 'NO (in-session)'}`)
  })
  
  await pool.end()
}
run().catch(e => { console.error(e.message); process.exit(1) })
