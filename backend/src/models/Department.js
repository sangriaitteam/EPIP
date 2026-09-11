const db = require('../config/db')

const Department = {
  async create({ name, head_id, color = '#6366f1' }) {
    const { rows } = await db.query(
      `INSERT INTO departments (name, head_id, color)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, head_id, color]
    )
    return rows[0]
  },

  async findAll() {
    const { rows } = await db.query(
      `SELECT d.*,
              e.first_name || ' ' || e.last_name AS head_name,
              COUNT(emp.id)::int AS employee_count
       FROM departments d
       LEFT JOIN employees e   ON d.head_id   = e.id
       LEFT JOIN employees emp ON emp.department_id = d.id AND emp.status = 'active'
       GROUP BY d.id, e.first_name, e.last_name
       ORDER BY d.name`
    )
    return rows
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT d.*, e.first_name || ' ' || e.last_name AS head_name
       FROM departments d
       LEFT JOIN employees e ON d.head_id = e.id
       WHERE d.id = $1`, [id]
    )
    return rows[0] || null
  },

  async update(id, fields) {
    const allowed = ['name', 'head_id', 'color']
    const sets = []; const vals = []
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k)) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length) return null
    vals.push(id)
    const { rows } = await db.query(
      `UPDATE departments SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`, vals
    )
    return rows[0] || null
  },

  async delete(id) {
    await db.query(`DELETE FROM departments WHERE id = $1`, [id])
  },
}

module.exports = Department
