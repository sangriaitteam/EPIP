/**
 * ════════════════════════════════════════════════════
 *  Super Admin Setup Script
 *  Run: node src/scripts/addSuperAdmin.js
 *
 *  ✏️  STEP 1 — Edit YOUR details below (lines 15–17)
 *  ▶️  STEP 2 — Save this file
 *  ▶️  STEP 3 — Run: node src/scripts/addSuperAdmin.js
 * ════════════════════════════════════════════════════
 */
require('dotenv').config()
const bcrypt      = require('bcryptjs')
const { query, pool } = require('../config/db')

// ── ✏️  EDIT YOUR DETAILS HERE — then run the script, then clear these ────
const YOUR_NAME     = ''   // Fill in, run script, then clear back to ''
const YOUR_EMAIL    = ''   // Fill in, run script, then clear back to ''
const YOUR_PASSWORD = ''   // Fill in, run script, then clear back to ''
// ── ────────────────────────────────────────────────────────────────────────

const run = async () => {
  try {
    if (!YOUR_EMAIL.includes('@'))
      throw new Error('Invalid email format')
    if (YOUR_PASSWORD.length < 6)
      throw new Error('Password must be at least 6 characters')

    // Max 2 superadmins allowed
    const { rows: existing } = await query(
      `SELECT id, email FROM users WHERE role = 'admin' AND is_active = true`
    )

    const alreadyExists = existing.find(u => u.email === YOUR_EMAIL)

    if (!alreadyExists && existing.length >= 2) {
      console.error('❌ Maximum 2 Super Admins allowed. Deactivate one first.')
      return
    }

    const hashed = await bcrypt.hash(YOUR_PASSWORD, 12)

    const { rows } = await query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active, is_first_login)
       VALUES ($1, $2, $3, $4, 'admin', true, false)
       ON CONFLICT (email)
       DO UPDATE SET
         name          = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role          = 'admin',
         is_active     = true,
         updated_at    = NOW()
       RETURNING id, name, email, role`,
      [YOUR_NAME, YOUR_EMAIL, YOUR_EMAIL.split('@')[0], hashed]
    )

    console.log('\n✅ Super Admin set successfully!')
    console.log('─────────────────────────────────')
    console.log(`   Name     : ${rows[0].name}`)
    console.log(`   Email    : ${rows[0].email}`)
    console.log(`   Password : ${YOUR_PASSWORD}`)
    console.log(`   Role     : ${rows[0].role}`)
    console.log('─────────────────────────────────')
    console.log('   ⚠️  Password is bcrypt-hashed in DB')
    console.log('   🔐  Use Email + Password to login\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await pool.end()
  }
}

run()
