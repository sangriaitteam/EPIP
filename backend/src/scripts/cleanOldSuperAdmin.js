require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  // Deactivate old exposed superadmin account
  const { rows } = await query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE email = 'ruthishsagar68@gmail.com' AND role = 'admin'
     RETURNING id, name, email`
  )
  if (rows.length) {
    console.log('✅ Deactivated old exposed account:', rows[0].email)
  } else {
    console.log('ℹ️  Old account not found or already inactive.')
  }

  // Show remaining active superadmins
  const { rows: active } = await query(
    `SELECT id, name, email, role FROM users WHERE role = 'admin' AND is_active = true`
  )
  console.log('\nActive Super Admins:')
  active.forEach(u => console.log(`  ✅ ${u.name} — ${u.email}`))
  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })
