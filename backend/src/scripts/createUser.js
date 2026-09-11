/**
 * Super Admin uses this script to create Manager / Employee accounts in DB
 *
 * Usage:
 *   node src/scripts/createUser.js --name "Michael Chen" --username mgr.michael --password Manager@123 --role manager
 *   node src/scripts/createUser.js --name "Emily Rodriguez" --username emp.emily --password Emily@123 --role employee
 */
require('dotenv').config()
const bcrypt    = require('bcryptjs')
const { query, pool } = require('../config/db')

const args = process.argv.slice(2).reduce((acc, val, i, arr) => {
  if (val.startsWith('--')) acc[val.slice(2)] = arr[i + 1]
  return acc
}, {})

const { name, username, password, role = 'employee', email = '' } = args

if (!name || !username || !password) {
  console.error('Usage: node createUser.js --name "Full Name" --username user.name --password Pass@123 --role manager')
  process.exit(1)
}

const run = async () => {
  try {
    // Check if username already exists
    const { rows: existing } = await query(
      `SELECT id FROM users WHERE username = $1`, [username]
    )
    if (existing.length) {
      console.error(`❌ Username "${username}" already exists`)
      process.exit(1)
    }

    const hashed = await bcrypt.hash(password, 12)

    const { rows } = await query(
      `INSERT INTO users (name, email, username, password_hash, role, is_first_login, is_active)
       VALUES ($1, $2, $3, $4, $5, true, true)
       RETURNING id, name, username, role`,
      [name, email, username, hashed, role]
    )

    const user = rows[0]
    console.log('\n✅ User created successfully:')
    console.log(`   ID:       ${user.id}`)
    console.log(`   Name:     ${user.name}`)
    console.log(`   Username: ${user.username}`)
    console.log(`   Role:     ${user.role}`)
    console.log(`   Password: ${password}  (stored as bcrypt hash)`)
    console.log(`   First Login: true  (will be asked to verify documents)`)
    console.log('\n   Share these credentials with the user:')
    console.log(`   Username: ${username}`)
    console.log(`   Password: ${password}\n`)
  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await pool.end()
  }
}

run()
