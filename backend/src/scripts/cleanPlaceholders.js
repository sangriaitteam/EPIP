require('dotenv').config()
const { query, pool } = require('../config/db')

const run = async () => {
  // Deactivate all placeholder/test admin accounts (not the real one)
  const KEEP_EMAIL = 'ruthishs14@gmail.com' // ← your real superadmin email

  const { rows } = await query(
    `UPDATE users SET is_active = false, updated_at = NOW()
     WHERE role = 'admin' AND email != $1
     RETURNING id, name, email`,
    [KEEP_EMAIL]
  )

  if (rows.length) {
    console.log('Deactivated placeholder accounts:')
    rows.forEach(r => console.log(`  ❌ ${r.name} — ${r.email}`))
  } else {
    console.log('No placeholder accounts found.')
  }

  const { rows: active } = await query(
    `SELECT name, email FROM users WHERE role = 'admin' AND is_active = true`
  )
  console.log('\nActive Super Admins now:')
  active.forEach(u => console.log(`  ✅ ${u.name} — ${u.email}`))

  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })
