const db = require('../config/db')

const PARAMS = [
  'Attendance', 'Task Completion', 'Work Quality', 'Communication',
  'Ownership', 'Technical Skills', 'Problem Solving', 'Collaboration',
  'Discipline', 'Goal Achievement',
]

const PerformanceReview = {
  async create({ employee_id, reviewer_id, cycle, type }) {
    const { rows } = await db.query(
      `INSERT INTO performance_reviews (employee_id, reviewer_id, cycle, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [employee_id, reviewer_id, cycle, type]
    )
    return rows[0]
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT pr.*,
              e.first_name || ' ' || e.last_name  AS employee_name,
              r.first_name || ' ' || r.last_name  AS reviewer_name,
              d.name AS department_name
       FROM performance_reviews pr
       LEFT JOIN employees   e ON pr.employee_id = e.id
       LEFT JOIN employees   r ON pr.reviewer_id = r.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE pr.id = $1`, [id]
    )
    return rows[0] || null
  },

  async findByEmployee(employee_id) {
    const { rows } = await db.query(
      `SELECT pr.*, e.first_name || ' ' || e.last_name AS reviewer_name
       FROM performance_reviews pr
       LEFT JOIN employees e ON pr.reviewer_id = e.id
       WHERE pr.employee_id = $1
       ORDER BY pr.created_at DESC`,
      [employee_id]
    )
    return rows
  },

  async findAll({ status, type, department_id } = {}) {
    let q = `
      SELECT pr.*, e.first_name || ' ' || e.last_name AS employee_name,
             d.name AS department_name
      FROM performance_reviews pr
      JOIN employees   e ON pr.employee_id  = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1`
    const params = []
    if (status)        { params.push(status);        q += ` AND pr.status = $${params.length}` }
    if (type)          { params.push(type);          q += ` AND pr.type = $${params.length}` }
    if (department_id) { params.push(department_id); q += ` AND e.department_id = $${params.length}` }
    q += ` ORDER BY pr.created_at DESC`
    const { rows } = await db.query(q, params)
    return rows
  },

  async submitRatings(id, { parameters, manager_comments, reviewer_id }) {
    // Calculate overall score
    const scores  = parameters.map(p => p.score)
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

    const { rows } = await db.query(
      `UPDATE performance_reviews
       SET parameters       = $1::jsonb,
           overall_score    = $2,
           manager_comments = $3,
           reviewer_id      = $4,
           status           = 'completed',
           submitted_at     = NOW(),
           updated_at       = NOW()
       WHERE id = $5 RETURNING *`,
      [JSON.stringify(parameters), overall, manager_comments, reviewer_id, id]
    )
    return rows[0]
  },

  async hrApprove(id, hr_comments) {
    const { rows } = await db.query(
      `UPDATE performance_reviews
       SET hr_comments = $1, hr_approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [hr_comments, id]
    )
    return rows[0]
  },

  async getDefaultParams() {
    return PARAMS.map(name => ({ name, score: 0, max_score: 100, comments: '' }))
  },
}

module.exports = PerformanceReview
