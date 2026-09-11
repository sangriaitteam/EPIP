const Attendance = require('../models/Attendance')
const Employee   = require('../models/Employee')
const { query }  = require('../config/db')
const { ok, created, fail } = require('../utils/response')

// POST /api/attendance/check-in
const checkIn = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const { work_mode } = req.body
    const record = await Attendance.checkIn({ employee_id: employee.id, work_mode })
    return created(res, record, 'Checked in successfully')
  } catch (err) {
    if (err.message.includes('Already checked in')) return fail(res, err.message, 409)
    next(err)
  }
}

// POST /api/attendance/check-out
const checkOut = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const record = await Attendance.checkOut(employee.id)
    return ok(res, record, 'Checked out successfully')
  } catch (err) {
    if (err.message.includes('No check-in')) return fail(res, err.message, 404)
    next(err)
  }
}

// POST /api/attendance/pause  — start a break
const pauseWork = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const today = new Date().toISOString().split('T')[0]

    // Must be checked in
    const record = await Attendance.findByDate(employee.id, today)
    if (!record?.check_in)  return fail(res, 'You must check in before pausing', 409)
    if (record.check_out)   return fail(res, 'You have already checked out', 409)

    // Only one active pause at a time
    const existing = await Attendance.getActivePause(employee.id)
    if (existing) return fail(res, 'Already on a break — resume first', 409)

    const VALID_REASONS = ['tea_break', 'lunch_break', 'meeting', 'personal', 'other']
    const { reason = 'other', comment } = req.body
    const resolvedReason = VALID_REASONS.includes(reason) ? reason : 'other'

    const { rows } = await query(
      `INSERT INTO attendance_pauses (attendance_id, employee_id, pause_start, reason, comment)
       VALUES ($1, $2, NOW(), $3, $4) RETURNING *`,
      [record.id, employee.id, resolvedReason, comment || null]
    )

    return created(res, rows[0], 'Break started')
  } catch (err) { next(err) }
}

// POST /api/attendance/resume  — end the current break
const resumeWork = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const activePause = await Attendance.getActivePause(employee.id)
    if (!activePause) return fail(res, 'No active break found', 404)

    // Close the pause and compute duration
    const { rows } = await query(
      `UPDATE attendance_pauses
       SET pause_end     = NOW(),
           duration_mins = ROUND(EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60, 2)
       WHERE id = $1
       RETURNING *`,
      [activePause.id]
    )
    const closed = rows[0]

    // Update running total on the attendance row
    await query(
      `UPDATE attendance
       SET total_pause_mins = COALESCE((
         SELECT ROUND(SUM(duration_mins)::numeric, 2)
         FROM attendance_pauses
         WHERE attendance_id = $1 AND pause_end IS NOT NULL
       ), 0),
       updated_at = NOW()
       WHERE id = $1`,
      [activePause.attendance_id]
    )

    return ok(res, closed, 'Break ended — resumed work')
  } catch (err) { next(err) }
}

// GET /api/attendance/pauses  — today's pause history for the employee
const getMyPauses = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const today = new Date().toISOString().split('T')[0]
    const record = await Attendance.findByDate(employee.id, today)
    if (!record) return ok(res, [])

    const pauses = await Attendance.getPauses(record.id)
    return ok(res, pauses)
  } catch (err) { next(err) }
}

// GET /api/attendance/pauses/:attendanceId  — HR/Admin: pauses for any attendance record
const getPausesByAttendance = async (req, res, next) => {
  try {
    const pauses = await Attendance.getPauses(req.params.attendanceId)
    return ok(res, pauses)
  } catch (err) { next(err) }
}

// GET /api/attendance/today
const getToday = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const today  = new Date().toISOString().split('T')[0]
    const record = await Attendance.findByDate(employee.id, today)
    return ok(res, record || { status: 'not_checked_in' })
  } catch (err) { next(err) }
}

// GET /api/attendance/my
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const { from, to, limit } = req.query
    const records = await Attendance.findByEmployee(employee.id, { from, to, limit })
    return ok(res, records)
  } catch (err) { next(err) }
}

// GET /api/attendance/summary
const getMySummary = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const now   = new Date()
    const year  = req.query.year  || now.getFullYear()
    const month = req.query.month || (now.getMonth() + 1)
    const summary = await Attendance.monthlySummary(employee.id, year, month)
    return ok(res, summary)
  } catch (err) { next(err) }
}

// GET /api/attendance/weekly  — employee's weekly breakdown for chart
const getWeeklyBreakdown = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee not found', 404)

    const now   = new Date()
    const year  = parseInt(req.query.year  || now.getFullYear())
    const month = parseInt(req.query.month || now.getMonth() + 1)
    const from  = `${year}-${String(month).padStart(2,'0')}-01`
    const last  = new Date(year, month, 0).getDate()
    const to    = `${year}-${String(month).padStart(2,'0')}-${String(last).padStart(2,'0')}`

    const { rows } = await query(
      `SELECT date, status, is_late FROM attendance
       WHERE employee_id=$1 AND date BETWEEN $2 AND $3 ORDER BY date`,
      [employee.id, from, to]
    )

    const weeks = [
      { week: 'Week 1', present: 0, late: 0, absent: 0 },
      { week: 'Week 2', present: 0, late: 0, absent: 0 },
      { week: 'Week 3', present: 0, late: 0, absent: 0 },
      { week: 'Week 4', present: 0, late: 0, absent: 0 },
    ]
    rows.forEach(r => {
      const day = new Date(r.date).getDate()
      const wi  = Math.min(Math.floor((day - 1) / 7), 3)
      if (r.status === 'present' && r.is_late)  weeks[wi].late++
      else if (r.status === 'present')           weeks[wi].present++
      else if (r.status === 'absent')            weeks[wi].absent++
    })

    return ok(res, weeks)
  } catch (err) { next(err) }
}

// GET /api/attendance/holidays  — all authenticated users
const getHolidays = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM holidays ORDER BY date ASC`)
    return ok(res, rows)
  } catch (err) { next(err) }
}

// GET /api/attendance/today-all  — HR/Admin all employees today
const getTodayAll = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { rows } = await query(
      `SELECT
         e.id          AS employee_id,
         e.employee_id AS emp_code,
         e.first_name,
         e.last_name,
         e.designation,
         d.name        AS department,
         a.id          AS attendance_id,
         a.check_in,
         a.check_out,
         a.hours_worked,
         a.overtime,
         a.work_mode,
         a.status,
         a.is_late
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN attendance  a ON a.employee_id = e.id AND a.date = $1
       JOIN users u ON e.user_id = u.id
       WHERE u.is_active = true
       ORDER BY e.first_name, e.last_name`,
      [today]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

// GET /api/attendance/employee/:id  (HR/Admin)
const getByEmployee = async (req, res, next) => {
  try {
    const { from, to, limit } = req.query
    const records = await Attendance.findByEmployee(req.params.id, { from, to, limit })
    return ok(res, records)
  } catch (err) { next(err) }
}

// GET /api/attendance/employee/:id/summary  (HR/Admin)
const getSummaryByEmployee = async (req, res, next) => {
  try {
    const now   = new Date()
    const year  = req.query.year  || now.getFullYear()
    const month = req.query.month || (now.getMonth() + 1)
    const summary = await Attendance.monthlySummary(req.params.id, year, month)
    return ok(res, summary)
  } catch (err) { next(err) }
}

module.exports = {
  checkIn, checkOut,
  pauseWork, resumeWork, getMyPauses, getPausesByAttendance,
  getToday, getMy, getMySummary,
  getWeeklyBreakdown, getHolidays, getTodayAll,
  getByEmployee, getSummaryByEmployee,
}
