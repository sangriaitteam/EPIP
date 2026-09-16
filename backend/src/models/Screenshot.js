const db = require('../config/db')

const Screenshot = {
  async create({ employee_id, file_path, file_url, active_window_title, monitor_name, monitor_count }) {
    const { rows } = await db.query(
      `INSERT INTO screenshots
         (employee_id, file_path, file_url, active_window_title, monitor_name, monitor_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        employee_id,
        file_path,
        file_url,
        active_window_title || null,
        monitor_name        || null,
        monitor_count       || 1,
      ]
    )
    return rows[0]
  },

  async findByEmployee(employee_id, { date, limit = 50 } = {}) {
    let q = `SELECT * FROM screenshots WHERE employee_id = $1`
    const params = [employee_id]
    if (date) {
      params.push(date)
      q += ` AND DATE(captured_at) = $${params.length}`
    }
    q += ` ORDER BY captured_at DESC LIMIT $${params.length + 1}`
    params.push(limit)
    const { rows } = await db.query(q, params)
    return rows
  },

  async findAll({ date, department_id, limit = 100 } = {}) {
    let q = `
      SELECT s.*, e.first_name || ' ' || e.last_name AS employee_name,
             d.name AS department_name
      FROM screenshots s
      JOIN employees   e ON s.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1`
    const params = []
    if (date) {
      params.push(date)
      q += ` AND DATE(s.captured_at) = $${params.length}`
    }
    if (department_id) {
      params.push(department_id)
      q += ` AND e.department_id = $${params.length}`
    }
    q += ` ORDER BY s.captured_at DESC LIMIT $${params.length + 1}`
    params.push(limit)
    const { rows } = await db.query(q, params)
    return rows
  },

  async countToday(employee_id) {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM screenshots
       WHERE employee_id = $1 AND DATE(captured_at) = CURRENT_DATE`,
      [employee_id]
    )
    return rows[0].cnt
  },
}

module.exports = Screenshot
