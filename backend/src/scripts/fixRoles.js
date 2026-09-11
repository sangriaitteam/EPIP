require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  // Fix superadmin → admin role
  const { rows: fixed } = await query(
    `UPDATE users SET role = 'admin', updated_at = NOW()
     WHERE role = 'superadmin'
     RETURNING id, name, username, role`
  )
  if (fixed.length) {
    console.log('Fixed superadmin → admin:')
    fixed.forEach(u => console.log(`  ✅ ${u.name} (${u.username}) → ${u.role}`))
  } else {
    console.log('No superadmin accounts to fix.')
  }

  // Show all active admins
  const { rows } = await query(
    `SELECT id, name, username, email, role, is_active
     FROM users WHERE role IN ('admin','hr') AND is_active = true
     ORDER BY id`
  )
  console.log('\nActive Admin accounts:')
  rows.forEach(u => console.log(`  ${u.role.padEnd(8)} | ${u.username} | ${u.name}`))

  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })
