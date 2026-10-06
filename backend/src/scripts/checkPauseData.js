require('dotenv').config()
const { Pool } = require('pg')
const pool = new Pool({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  database: process.env.DB_NAME, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
})

async function check() {
  // List all employees
  const { rows: users } = await pool.query("SELECT id, name FROM users WHERE role = 'employee'")
  console.log('=== Employees ===')
  users.forEach(u => console.log(u.id, u.name))

  // Get today's pauses for ALL employees
  const { rows: pauses } = await pool.query(`
    SELECT ap.id, u.name, ap.reason, ap.pause_start, ap.pause_end, ap.duration_mins
    FROM attendance_pauses ap
    JOIN attendance a ON ap.attendance_id = a.id
    JOIN employees e ON a.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE DATE(ap.pause_start) = CURRENT_DATE
    ORDER BY ap.pause_start DESC
    LIMIT 20
  `)
  console.log('\n=== All pauses today ===')
  pauses.forEach(p => {
    const start = new Date(p.pause_start).toLocaleTimeString('en-IN')
    const end = p.pause_end ? new Date(p.pause_end).toLocaleTimeString('en-IN') : 'OPEN'
    console.log(`${p.name} | ${p.reason} | ${start} → ${end} | ${p.duration_mins} mins`)
  })

  // Get today's sessions
  const { rows: sessions } = await pool.query(`
    SELECT u.name, es.login_at, es.logout_at, es.screen_off_mins, es.duration_mins
    FROM employee_sessions es
    JOIN employees e ON es.employee_id = e.id
    JOIN users u ON e.user_id = u.id
    WHERE DATE(es.login_at) = CURRENT_DATE
    ORDER BY es.login_at DESC
    LIMIT 10
  `)
  console.log('\n=== Sessions today ===')
  sessions.forEach(s => {
    const login = new Date(s.login_at).toLocaleTimeString('en-IN')
    const logout = s.logout_at ? new Date(s.logout_at).toLocaleTimeString('en-IN') : 'OPEN'
    console.log(`${s.name} | ${login} → ${logout} | screen_off=${s.screen_off_mins} work=${s.duration_mins}`)
  })

  await pool.end()
}
check().catch(e => { console.error(e.message); process.exit(1) })
