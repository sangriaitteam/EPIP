const Employee  = require('../models/Employee')
const { query } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const auditLog  = require('../utils/auditLog')

const VALID_MOODS = ['great', 'good', 'neutral', 'tough', 'bad']

// POST /api/daily-reports  — submit or update today's report
const submitToday = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const { work_summary, achievements, blockers, plan_tomorrow, mood = 'good' } = req.body
    if (!work_summary?.trim()) return fail(res, 'Work summary is required', 400)

    const resolvedMood = VALID_MOODS.includes(mood) ? mood : 'good'
    const today = new Date().toISOString().split('T')[0]

    const { rows } = await query(
      `INSERT INTO daily_reports
         (employee_id, report_date, work_summary, achievements, blockers, plan_tomorrow, mood)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id, report_date) DO UPDATE SET
         work_summary  = EXCLUDED.work_summary,
         achievements  = EXCLUDED.achievements,
         blockers      = EXCLUDED.blockers,
         plan_tomorrow = EXCLUDED.plan_tomorrow,
         mood          = EXCLUDED.mood,
         updated_at    = NOW()
       RETURNING *`,
      [
        employee.id, today,
        work_summary.trim(),
        achievements?.trim() || null,
        blockers?.trim()     || null,
        plan_tomorrow?.trim()|| null,
        resolvedMood,
      ]
    )

    await auditLog(req.user.id, 'SUBMIT_DAILY_REPORT', 'daily_reports', rows[0].id)
    return created(res, rows[0], 'Daily report submitted')
  } catch (err) { next(err) }
}

// GET /api/daily-reports/my?limit=7  — employee's own reports
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const limit = Math.min(parseInt(req.query.limit) || 7, 30)
    const { rows } = await query(
      `SELECT * FROM daily_reports
       WHERE employee_id = $1
       ORDER BY report_date DESC
       LIMIT $2`,
      [employee.id, limit]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

// GET /api/daily-reports/today  — today's report if exists
const getToday = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const today = new Date().toISOString().split('T')[0]
    const { rows } = await query(
      `SELECT * FROM daily_reports WHERE employee_id = $1 AND report_date = $2`,
      [employee.id, today]
    )
    return ok(res, rows[0] || null)
  } catch (err) { next(err) }
}

// GET /api/daily-reports  — HR/Admin sees all reports
const getAll = async (req, res, next) => {
  try {
    const { date, employee_id, limit = 50 } = req.query
    let q = `
      SELECT dr.*,
             e.first_name, e.last_name, e.employee_id AS emp_code,
             d.name AS department
      FROM daily_reports dr
      JOIN employees e ON dr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1`
    const params = []

    if (date)        { params.push(date);        q += ` AND dr.report_date = $${params.length}` }
    if (employee_id) { params.push(employee_id); q += ` AND dr.employee_id = $${params.length}` }

    params.push(Math.min(parseInt(limit), 100))
    q += ` ORDER BY dr.report_date DESC, e.first_name ASC LIMIT $${params.length}`

    const { rows } = await query(q, params)
    return ok(res, rows)
  } catch (err) { next(err) }
}

// GET /api/daily-reports/employee/:id  — HR views one employee's reports
const getByEmployee = async (req, res, next) => {
  try {
    const { limit = 14 } = req.query
    const { rows } = await query(
      `SELECT * FROM daily_reports
       WHERE employee_id = $1
       ORDER BY report_date DESC
       LIMIT $2`,
      [req.params.id, Math.min(parseInt(limit), 30)]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

module.exports = { submitToday, getMy, getToday, getAll, getByEmployee }
