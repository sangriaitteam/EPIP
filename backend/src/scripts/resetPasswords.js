/**
 * Reset passwords for admin and hr accounts
 * Run: node src/scripts/resetPasswords.js
 */
require('dotenv').config()
const bcrypt      = require('bcryptjs')
const { query, pool } = require('../config/db')

const accounts = [
  { username: 'admin',          password: 'Admin@1234' },
  { username: 'hr',             password: 'Hr@1234'    },
  { username: 'ruthishsagar68', password: 'Ruthish@1234' },
]

const run = async () => {
  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.password, 12)
    const { rows } = await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE username = $2
       RETURNING id, name, username, role`,
      [hash, acc.username]
    )
    if (rows[0]) {
      console.log(`✅ ${rows[0].name} (${rows[0].role})`)
      console.log(`   Username : ${acc.username}`)
      console.log(`   Password : ${acc.password}\n`)
    } else {
      console.log(`⚠️  username "${acc.username}" not found\n`)
    }
  }
  await pool.end()
}

run().catch(e => { console.error(e.message); pool.end() })
