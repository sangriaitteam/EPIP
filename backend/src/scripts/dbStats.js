require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  const tables = [
    'users','departments','employees','attendance','tasks','goals',
    'performance_reviews','self_assessments','screenshots','notifications',
    'holidays','shifts','system_settings','audit_logs','leave_requests',
    'task_comments','employee_skills','employee_education',
    'employee_experience','employee_certifications','_migrations'
  ]
  console.log('\n📊 PostgreSQL epip_db — Table Stats\n')
  console.log('Table'.padEnd(30) + 'Rows')
  console.log('─'.repeat(40))
  let total = 0
  for (const t of tables) {
    try {
      const { rows } = await query(`SELECT COUNT(*)::int AS cnt FROM ${t}`)
      const cnt = rows[0].cnt
      total += cnt
      console.log(t.padEnd(30) + cnt)
    } catch { console.log(t.padEnd(30) + 'N/A') }
  }
  console.log('─'.repeat(40))
  console.log('TOTAL ROWS'.padEnd(30) + total)
  console.log(`\nDatabase: epip_db | Tables: ${tables.length}\n`)
  await pool.end()
}
run()
