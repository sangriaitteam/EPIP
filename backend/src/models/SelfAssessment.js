const db = require('../config/db')

const SelfAssessment = {
  async upsert({ employee_id, period, achievements, challenges, strengths, weaknesses, career_goals, manager_discussion_notes }) {
    const { rows } = await db.query(
      `INSERT INTO self_assessments
         (employee_id, period, achievements, challenges, strengths, weaknesses,
          career_goals, manager_discussion_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (employee_id, period)
       DO UPDATE SET
         achievements              = EXCLUDED.achievements,
         challenges                = EXCLUDED.challenges,
         strengths                 = EXCLUDED.strengths,
         weaknesses                = EXCLUDED.weaknesses,
         career_goals              = EXCLUDED.career_goals,
         manager_discussion_notes  = EXCLUDED.manager_discussion_notes,
         status                    = 'draft',
         updated_at                = NOW()
       RETURNING *`,
      [employee_id, period, achievements, challenges, strengths, weaknesses, career_goals, manager_discussion_notes]
    )
    return rows[0]
  },

  async submit(id) {
    const { rows } = await db.query(
      `UPDATE self_assessments
       SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`, [id]
    )
    return rows[0]
  },

  async findByEmployee(employee_id, period) {
    let q = `SELECT * FROM self_assessments WHERE employee_id = $1`
    const params = [employee_id]
    if (period) { params.push(period); q += ` AND period = $${params.length}` }
    q += ` ORDER BY created_at DESC LIMIT 1`
    const { rows } = await db.query(q, params)
    return rows[0] || null
  },

  async findAll() {
    const { rows } = await db.query(
      `SELECT sa.*, e.first_name || ' ' || e.last_name AS employee_name
       FROM self_assessments sa
       JOIN employees e ON sa.employee_id = e.id
       ORDER BY sa.created_at DESC`
    )
    return rows
  },
}

module.exports = SelfAssessment
