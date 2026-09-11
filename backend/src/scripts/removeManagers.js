require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  const { rows } = await query(
    `DELETE FROM users WHERE role = 'manager' RETURNING username, name`
  )
  if (rows.length) {
    console.log('\n✅ Removed manager users from DB:')
    rows.forEach(u => console.log(`   - ${u.name} (${u.username})`))
  } else {
    console.log('No manager users found in DB')
  }
  console.log('\nDone.\n')
  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })
