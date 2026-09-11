require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  const { rows } = await query(
    `SELECT username, role, name, is_first_login, is_active
     FROM users
     WHERE role IN ('employee')
     ORDER BY role, username`
  )
  console.log('\n✅ Manager + Employee users in DB:\n')
  console.log('Role     '.padEnd(12) + 'Username'.padEnd(18) + 'Name'.padEnd(22) + 'First Login')
  console.log('─'.repeat(70))
  rows.forEach(u => {
    console.log(
      u.role.padEnd(12) +
      u.username.padEnd(18) +
      u.name.padEnd(22) +
      (u.is_first_login ? 'YES (verification required)' : 'no')
    )
  })
  console.log(`\nTotal: ${rows.length} users\n`)
  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })

