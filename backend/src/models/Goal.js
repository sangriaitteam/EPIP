const db = require('../config/db')

const Goal = {
  async create(data) {
    const {
      employee_id, title, description, type, period, weightage,
      due_date, kpi_metric, department_id,
    } = data
    const { rows } = await db.query(
      `INSERT INTO goals
         (employee_id, title, description, type, period, weightage,
          due_date, kpi_metric, department_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [employee_id, title, description, type, period, weightage,
       due_date, kpi_metric, department_id]
    )
    return rows[0]
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT g.*, e.first_name || ' ' || e.last_name AS employee_name,
              d.name AS department_name
       FROM goals g
       LEFT JOIN employees   e ON g.employee_id   = e.id
       LEFT JOIN departments d ON g.department_id = d.id
       WHERE g.id = $1`, [id]
    )
    return rows[0] || null
  },

  async findByEmployee(employee_id, { type, status } = {}) {
    let q = `SELECT * FROM goals WHERE employee_id = $1`
    const params = [employee_id]
    if (type)   { params.push(type);   q += ` AND type = $${params.length}` }
    if (status) { params.push(status); q += ` AND status = $${params.length}` }
    q += ` ORDER BY created_at DESC`
    const { rows } = await db.query(q, params)
    return rows
  },

  async findByDepartment(department_id) {
    const { rows } = await db.query(
      `SELECT g.*, e.first_name || ' ' || e.last_name AS employee_name
       FROM goals g
       JOIN employees e ON g.employee_id = e.id
       WHERE e.department_id = $1
       ORDER BY g.created_at DESC`, [department_id]
    )
    return rows
  },

  async update(id, fields) {
    const allowed = [
      'title', 'description', 'type', 'period', 'weightage', 'completion_percent',
      'status', 'due_date', 'kpi_metric', 'approval_status',
    ]
    const sets = []; const vals = []
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k)) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length) return null
    vals.push(id)
    const { rows } = await db.query(
      `UPDATE goals SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`, vals
    )
    return rows[0] || null
  },

  async approve(id, approved_by) {
    const { rows } = await db.query(
      `UPDATE goals SET approval_status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2 RETURNING *`,
      [approved_by, id]
    )
    return rows[0]
  },

  async uploadEvidence(id, file_url, file_name) {
    await db.query(
      `UPDATE goals SET
         evidence = COALESCE(evidence, '[]'::jsonb) || $1::jsonb,
         updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify([{ url: file_url, name: file_name, uploaded_at: new Date() }]), id]
    )
  },

  async delete(id) {
    await db.query(`DELETE FROM goals WHERE id = $1`, [id])
  },
}

module.exports = Goal
