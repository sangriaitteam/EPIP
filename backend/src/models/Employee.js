const db = require('../config/db')

const Employee = {
  async create(data) {
    const {
      user_id, employee_id, first_name, last_name, email, phone,
      department_id, designation, manager_id, join_date,
      work_mode = 'office', salary, location,
    } = data
    const { rows } = await db.query(
      `INSERT INTO employees
         (user_id, employee_id, first_name, last_name, email, phone,
          department_id, designation, manager_id, join_date, work_mode, salary, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [user_id, employee_id, first_name, last_name, email, phone,
       department_id, designation, manager_id, join_date, work_mode, salary, location]
    )
    return rows[0]
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT e.*,
              d.name AS department_name,
              m.first_name || ' ' || m.last_name AS manager_name,
              u.role
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN employees  m ON e.manager_id = m.id
       LEFT JOIN users      u ON e.user_id = u.id
       WHERE e.id = $1`,
      [id]
    )
    return rows[0] || null
  },

  async findByUserId(user_id) {
    const { rows } = await db.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.user_id = $1`,
      [user_id]
    )
    return rows[0] || null
  },

  async findAll({ department_id, work_mode, status, search } = {}) {
    let q = `
      SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, e.phone,
             e.designation, e.work_mode, e.status, e.join_date, e.profile_completion,
             e.avatar_url, d.name AS department_name,
             m.first_name || ' ' || m.last_name AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees   m ON e.manager_id    = m.id
      WHERE 1=1`
    const params = []
    if (department_id) { params.push(department_id); q += ` AND e.department_id = $${params.length}` }
    if (work_mode)     { params.push(work_mode);     q += ` AND e.work_mode = $${params.length}` }
    if (status)        { params.push(status);        q += ` AND e.status = $${params.length}` }
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR e.email ILIKE $${params.length})`
    }
    q += ` ORDER BY e.created_at DESC`
    const { rows } = await db.query(q, params)
    return rows
  },

  async findByManager(manager_id) {
    const { rows } = await db.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.manager_id = $1 AND e.status = 'active'
       ORDER BY e.first_name`,
      [manager_id]
    )
    return rows
  },

  async update(id, fields) {
    const allowed = [
      'first_name', 'last_name', 'phone', 'department_id', 'designation',
      'manager_id', 'work_mode', 'salary', 'location', 'status', 'avatar_url',
      'profile_completion',
    ]
    const sets = []
    const vals = []
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k)) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length) return null
    vals.push(id)
    const { rows } = await db.query(
      `UPDATE employees SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`,
      vals
    )
    return rows[0] || null
  },

  async updateProfileCompletion(id) {
    // Count filled fields and compute %
    const { rows } = await db.query(
      `SELECT * FROM employees WHERE id = $1`, [id]
    )
    if (!rows[0]) return
    const emp = rows[0]
    const fields = ['phone', 'department_id', 'designation', 'manager_id', 'location', 'join_date', 'avatar_url']
    const filled = fields.filter(f => emp[f] !== null && emp[f] !== '').length
    const pct = Math.round(((filled + 2) / (fields.length + 2)) * 100)
    await db.query(`UPDATE employees SET profile_completion = $1 WHERE id = $2`, [pct, id])
  },
}

module.exports = Employee
