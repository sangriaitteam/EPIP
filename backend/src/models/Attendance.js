const db = require('../config/db')

const Attendance = {
  async checkIn({ employee_id, work_mode = 'office' }) {
    const today = new Date().toISOString().split('T')[0]
    // Prevent duplicate check-in
    const existing = await this.findByDate(employee_id, today)
    if (existing && existing.check_in) throw new Error('Already checked in today')

    const { rows } = await db.query(
      `INSERT INTO attendance (employee_id, date, check_in, work_mode, status)
       VALUES ($1, $2, NOW(), $3, 'present')
       ON CONFLICT (employee_id, date)
       DO UPDATE SET check_in = NOW(), work_mode = $3, status = 'present'
       RETURNING *`,
      [employee_id, today, work_mode]
    )
    return rows[0]
  },

  async checkOut(employee_id) {
    const today = new Date().toISOString().split('T')[0]

    // Auto-close any open pause before checking out
    await db.query(
      `UPDATE attendance_pauses
       SET pause_end     = NOW(),
           duration_mins = ROUND(EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60, 2)
       WHERE attendance_id = (
         SELECT id FROM attendance WHERE employee_id = $1 AND date = $2
       ) AND pause_end IS NULL`,
      [employee_id, today]
    )

    // Recalculate total_pause_mins from all completed pauses
    await db.query(
      `UPDATE attendance
       SET total_pause_mins = COALESCE((
         SELECT ROUND(SUM(duration_mins)::numeric, 2)
         FROM attendance_pauses
         WHERE attendance_id = attendance.id AND pause_end IS NOT NULL
       ), 0)
       WHERE employee_id = $1 AND date = $2`,
      [employee_id, today]
    )

    // hours_worked = (check_out - check_in) - total_pause_mins, minus pause time
    const { rows } = await db.query(
      `UPDATE attendance
       SET check_out    = NOW(),
           hours_worked = ROUND(
             GREATEST(0,
               EXTRACT(EPOCH FROM (NOW() - check_in)) / 3600
               - total_pause_mins / 60
             )::numeric, 2),
           overtime     = GREATEST(0, ROUND(
             GREATEST(0,
               EXTRACT(EPOCH FROM (NOW() - check_in)) / 3600
               - total_pause_mins / 60
             ) - 8, 2)),
           updated_at   = NOW()
       WHERE employee_id = $1 AND date = $2
       RETURNING *`,
      [employee_id, today]
    )
    if (!rows[0]) throw new Error('No check-in record found for today')
    return rows[0]
  },

  async findByDate(employee_id, date) {
    const { rows } = await db.query(
      `SELECT * FROM attendance WHERE employee_id = $1 AND date = $2`,
      [employee_id, date]
    )
    return rows[0] || null
  },

  async findByEmployee(employee_id, { from, to, limit = 50 } = {}) {
    let q = `SELECT * FROM attendance WHERE employee_id = $1`
    const params = [employee_id]
    if (from) { params.push(from); q += ` AND date >= $${params.length}` }
    if (to)   { params.push(to);   q += ` AND date <= $${params.length}` }
    q += ` ORDER BY date DESC LIMIT $${params.length + 1}`
    params.push(limit)
    const { rows } = await db.query(q, params)
    return rows
  },

  async monthlySummary(employee_id, year, month) {
    const { rows } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'present')::int  AS present,
         COUNT(*) FILTER (WHERE status = 'absent')::int   AS absent,
         COUNT(*) FILTER (WHERE status = 'leave')::int    AS leave,
         COUNT(*) FILTER (WHERE is_late = true)::int      AS late,
         ROUND(SUM(COALESCE(overtime, 0))::numeric, 2)    AS total_overtime,
         ROUND(
           COUNT(*) FILTER (WHERE status = 'present')::numeric /
           NULLIF(COUNT(*), 0) * 100, 1
         ) AS attendance_percent
       FROM attendance
       WHERE employee_id = $1
         AND EXTRACT(YEAR  FROM date) = $2
         AND EXTRACT(MONTH FROM date) = $3`,
      [employee_id, year, month]
    )
    return rows[0]
  },

  // Get all pauses for a given attendance record
  async getPauses(attendance_id) {
    const { rows } = await db.query(
      `SELECT * FROM attendance_pauses
       WHERE attendance_id = $1
       ORDER BY pause_start ASC`,
      [attendance_id]
    )
    return rows
  },

  // Get active (open) pause for an employee today
  async getActivePause(employee_id) {
    const today = new Date().toISOString().split('T')[0]
    const { rows } = await db.query(
      `SELECT ap.* FROM attendance_pauses ap
       JOIN attendance a ON ap.attendance_id = a.id
       WHERE a.employee_id = $1 AND a.date = $2
         AND ap.pause_end IS NULL
       ORDER BY ap.pause_start DESC
       LIMIT 1`,
      [employee_id, today]
    )
    return rows[0] || null
  },

  async markAbsent(employee_id, date) {
    const { rows } = await db.query(
      `INSERT INTO attendance (employee_id, date, status)
       VALUES ($1, $2, 'absent')
       ON CONFLICT (employee_id, date) DO NOTHING
       RETURNING *`,
      [employee_id, date]
    )
    return rows[0]
  },

  async companyStats(from, to) {
    const { rows } = await db.query(
      `SELECT
         ROUND(
           COUNT(*) FILTER (WHERE status = 'present')::numeric /
           NULLIF(COUNT(*), 0) * 100, 1
         ) AS attendance_rate,
         COUNT(DISTINCT employee_id)::int AS employees_tracked
       FROM attendance
       WHERE date BETWEEN $1 AND $2`,
      [from, to]
    )
    return rows[0]
  },
}

module.exports = Attendance
