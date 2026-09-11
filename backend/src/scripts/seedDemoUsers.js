/**
 * Seeds all demo Manager + Employee users into the real database
 * Run: node src/scripts/seedDemoUsers.js
 */
require('dotenv').config()
const bcrypt      = require('bcryptjs')
const { query, pool } = require('../config/db')

const DEMO_USERS = [
  // ── Managers ──────────────────────────────────────────────────────────────
  { name: 'Michael Chen',    username: 'mgr.michael', password: 'Manager@123',  role: 'manager',  email: 'michael.chen@sangria.com'  },
  { name: 'Lisa Park',       username: 'mgr.lisa',    password: 'Manager@456',  role: 'manager',  email: 'lisa.park@sangria.com'     },
  { name: 'David Kim',       username: 'mgr.david',   password: 'Manager@789',  role: 'manager',  email: 'david.kim@sangria.com'     },

  // ── Employees ─────────────────────────────────────────────────────────────
  { name: 'Emily Rodriguez', username: 'emp.emily',   password: 'Emily@2026',   role: 'employee', email: 'emily.r@sangria.com'       },
  { name: 'James Walker',    username: 'emp.james',   password: 'James@2026',   role: 'employee', email: 'james.w@sangria.com'       },
  { name: 'Priya Sharma',    username: 'emp.priya',   password: 'Priya@2026',   role: 'employee', email: 'priya.s@sangria.com'       },
  { name: 'Daniel Martinez', username: 'emp.daniel',  password: 'Daniel@2026',  role: 'employee', email: 'daniel.m@sangria.com'      },
  { name: 'Aisha Okonkwo',   username: 'emp.aisha',   password: 'Aisha@2026',   role: 'employee', email: 'aisha.o@sangria.com'       },
]

const run = async () => {
  console.log('\n🌱 Seeding demo Manager + Employee users into database...\n')
  let created = 0, skipped = 0

  for (const u of DEMO_USERS) {
    try {
      // Check if username already exists
      const { rows: existing } = await query(
        `SELECT id FROM users WHERE username = $1 OR email = $2`,
        [u.username, u.email]
      )

      if (existing.length) {
        console.log(`⏭  Skipping (already exists): ${u.username}`)
        skipped++
        continue
      }

      const hashed = await bcrypt.hash(u.password, 12)

      await query(
        `INSERT INTO users (name, email, username, password_hash, role, is_first_login, is_active)
         VALUES ($1, $2, $3, $4, $5, true, true)`,
        [u.name, u.email, u.username, hashed, u.role]
      )

      console.log(`✅ Created [${u.role.padEnd(8)}] ${u.name.padEnd(20)} | username: ${u.username.padEnd(15)} | password: ${u.password}`)
      created++

    } catch (err) {
      console.error(`❌ Error creating ${u.username}:`, err.message)
    }
  }

  console.log('\n══════════════════════════════════════════════════')
  console.log(`  Created: ${created}  |  Skipped: ${skipped}`)
  console.log('══════════════════════════════════════════════════')

  console.log('\n📋 Login Credentials (share with users):')
  console.log('\nMANAGERS:')
  DEMO_USERS.filter(u => u.role === 'manager').forEach(u => {
    console.log(`  Username: ${u.username.padEnd(15)} | Password: ${u.password}`)
  })
  console.log('\nEMPLOYEES:')
  DEMO_USERS.filter(u => u.role === 'employee').forEach(u => {
    console.log(`  Username: ${u.username.padEnd(15)} | Password: ${u.password}`)
  })
  console.log('')

  await pool.end()
}

run()

