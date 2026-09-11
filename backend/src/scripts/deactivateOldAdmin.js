require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  // Deactivate old placeholder admin accounts (not superadmin)
  const { rows } = await query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE role = 'hr'
     RETURNING id, name, username`
  )
  if (rows.length) {
    console.log('Deactivated old admin accounts:')
    rows.forEach(r => console.log(`  - ${r.name} (${r.username})`))
  } else {
    console.log('No hr accounts to deactivate.')
  }
  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })
