const db = require('../config/db')
const bcrypt = require('bcryptjs')

const User = {
  // ── Create ─────────────────────────────────────────────────────────────────
  async create({ name, email, password, role = 'employee' }) {
    const hashed = await bcrypt.hash(password, 12)
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashed, role]
    )
    return rows[0]
  },

  // ── Find ───────────────────────────────────────────────────────────────────
  async findById(id) {
    const { rows } = await db.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users WHERE id = $1`,
      [id]
    )
    return rows[0] || null
  },

  async findByEmail(email) {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    )
    return rows[0] || null
  },

  async findByUsername(username) {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE username = $1`, [username]
    )
    return rows[0] || null
  },

  async findAll({ role, is_active } = {}) {
    let q = `SELECT id, name, email, username, role, is_active, created_at FROM users WHERE 1=1`
    const params = []
    if (role)       { params.push(role);      q += ` AND role = $${params.length}` }
    if (is_active !== undefined) { params.push(is_active); q += ` AND is_active = $${params.length}` }
    q += ` ORDER BY created_at DESC`
    const { rows } = await db.query(q, params)
    return rows
  },

  // ── Update ─────────────────────────────────────────────────────────────────
  async update(id, fields) {
    const allowed = ['name', 'email', 'role', 'is_active']
    const sets = []
    const vals = []
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k)) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length) return null
    vals.push(id)
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length}
       RETURNING id, name, email, role, is_active`,
      vals
    )
    return rows[0] || null
  },

  async updatePassword(id, newPassword) {
    const hashed = await bcrypt.hash(newPassword, 12)
    await db.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hashed, id]
    )
  },

  // ── Auth helpers ───────────────────────────────────────────────────────────
  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash)
  },

  async deactivate(id) {
    await db.query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [id])
  },

  async clearFirstLogin(id) {
    await db.query(
      `UPDATE users SET is_first_login = false, updated_at = NOW() WHERE id = $1`,
      [id]
    )
  },

}

module.exports = User
