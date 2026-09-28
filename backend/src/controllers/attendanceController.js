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
    const today = new Date().toISOString().split('T')[0]

    // Check if this day is locked due to too many login/logout cycles
    const existing = await Attendance.findByDate(employee.id, today)
    if (existing?.is_locked) {
      return fail(res,
        'Your attendance for today is locked due to repeated login/logout activity. Contact your admin.',
        423
      )
    }

    // Detect re-login (already has a session today that was logged out)
    const { rows: prevSessions } = await query(
      `SELECT COUNT(*) AS cnt FROM employee_sessions
       WHERE employee_id = $1
         AND DATE(login_at AT TIME ZONE 'Asia/Kolkata') = $2
         AND logout_at IS NOT NULL`,
      [employee.id, today]
    )
    const reLoginCount = parseInt(prevSessions[0]?.cnt || 0)
    const isReLogin = reLoginCount > 0

    // Check-in (upsert attendance row — allows re-login same day)
    const record = await Attendance.checkIn({ employee_id: employee.id, work_mode, allowReLogin: true })

    // Insert new session row for this login
    await query(
      `INSERT INTO employee_sessions (employee_id, attendance_id, login_at)
       VALUES ($1, $2, NOW())`,
      [employee.id, record.id]
    )

    // Warning logic — only on re-login
    let warningCount = record.warning_count || 0
    let warning = null

    if (isReLogin) {
      warningCount = warningCount + 1
      const LOCK_THRESHOLD = 4   // lock after 4 warnings (4+ re-login cycles)

      if (warningCount >= LOCK_THRESHOLD) {
        // Lock the day
        await query(
          `UPDATE attendance
           SET warning_count = $1, is_locked = true,
               locked_reason = 'Excessive login/logout cycles'
           WHERE employee_id = $2 AND date = $3`,
          [warningCount, employee.id, today]
        )
        return fail(res,
          `Your attendance for today has been locked after ${warningCount} repeated login/logout cycles. Contact your admin.`,
          423
        )
      } else {
        // Increment warning, not yet locked
        await query(
          `UPDATE attendance SET warning_count = $1 WHERE employee_id = $2 AND date = $3`,
          [warningCount, employee.id, today]
        )
        const remaining = LOCK_THRESHOLD - warningCount
        warning = {
          count:     warningCount,
          remaining,
          message:   `⚠️ Warning ${warningCount}: Frequent login/logout detected. ${remaining} more time${remaining !== 1 ? 's' : ''} and your attendance will be locked.`,
        }
      }
    }

    return created(res, { ...record, warning_count: warningCount, warning }, 'Checked in successfully')
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

    // Compute break totals for this session (pauses since last login_at)
    const { rows: lastSession } = await query(
      `SELECT login_at FROM employee_sessions
       WHERE employee_id = $1 AND logout_at IS NULL
       ORDER BY login_at DESC LIMIT 1`,
      [employee.id]
    )
    const sessionLoginAt = lastSession[0]?.login_at || record.check_in

    const { rows: breakRows } = await query(
      `SELECT reason, COALESCE(duration_mins, 0) AS duration_mins
       FROM attendance_pauses
       WHERE attendance_id = $1
         AND pause_start >= $2
         AND pause_end IS NOT NULL`,
      [record.id, sessionLoginAt]
    )
    const manualMins = breakRows
      .filter(p => p.reason !== 'screen_lock')
      .reduce((s, p) => s + parseFloat(p.duration_mins), 0)
    const screenMins = breakRows
      .filter(p => p.reason === 'screen_lock')
      .reduce((s, p) => s + parseFloat(p.duration_mins), 0)

    // Close the latest open session
    await query(
      `UPDATE employee_sessions
       SET logout_at         = NOW(),
           manual_break_mins = $1,
           screen_off_mins   = $2,
           duration_mins     = GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM (NOW() - login_at)) / 60 - $1 - $2
           , 2))
       WHERE id = (
         SELECT id FROM employee_sessions
         WHERE employee_id = $3 AND logout_at IS NULL
         ORDER BY login_at DESC LIMIT 1
       )`,
      [manualMins, screenMins, employee.id]
    )

    // Recalculate total work hours from ALL sessions today using live formula
    // Work = (logout - login) - all pauses per session
    const { rows: sessionTotals } = await query(
      `SELECT COALESCE(SUM(
         GREATEST(0,
           EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
           - COALESCE((
               SELECT SUM(
                 CASE
                   WHEN ap.pause_end IS NOT NULL
                     THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                   ELSE 0
                 END
               )
               FROM attendance_pauses ap
               WHERE ap.attendance_id = s.attendance_id
                 AND ap.pause_start >= s.login_at
                 AND ap.pause_start <= COALESCE(s.logout_at, NOW())
             ), 0)
         )
       ), 0) AS total_work_mins
       FROM employee_sessions s
       WHERE s.employee_id = $1
         AND DATE(s.login_at AT TIME ZONE 'Asia/Kolkata') = $2
         AND s.logout_at IS NOT NULL`,
      [employee.id, new Date().toISOString().split('T')[0]]
    )
    const totalWorkMins = parseFloat(sessionTotals[0]?.total_work_mins || 0)
    const totalWorkHrs  = Math.round((totalWorkMins / 60) * 100) / 100
    const OT_THRESHOLD  = 9   // hours — OT starts after 9 hours
    const otHrs         = Math.max(0, Math.round((totalWorkHrs - OT_THRESHOLD) * 100) / 100)

    // Update attendance with corrected hours + OT
    await query(
      `UPDATE attendance
       SET hours_worked = $1,
           overtime     = $2,
           updated_at   = NOW()
       WHERE employee_id = $3 AND date = $4`,
      [totalWorkHrs, otHrs, employee.id, new Date().toISOString().split('T')[0]]
    )

    return ok(res, { ...record, hours_worked: totalWorkHrs, overtime: otHrs }, 'Checked out successfully')
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

    const VALID_REASONS = ['tea_break', 'lunch_break', 'meeting', 'personal', 'other', 'screen_lock']
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

// GET /api/attendance/sessions/:employeeId?date=YYYY-MM-DD
const getSessionsByEmployee = async (req, res, next) => {
  try {
    const { employeeId } = req.params
    const date = req.query.date || new Date().toISOString().split('T')[0]

    const { rows } = await query(
      `SELECT
         s.id,
         s.employee_id,
         s.login_at,
         s.logout_at,
         -- Live work duration: (elapsed since login OR stored logout) minus all pauses
         ROUND(
           GREATEST(0,
             -- Total elapsed for this session (minutes)
             EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
             -- Minus all pauses (manual + screen-off), including active ones
             - COALESCE((
                 SELECT SUM(
                   CASE
                     WHEN ap.pause_end IS NOT NULL
                       THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                     ELSE
                       EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
                   END
                 )
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = s.attendance_id
                   AND ap.pause_start >= s.login_at
                   AND (s.logout_at IS NULL OR ap.pause_start <= s.logout_at)
               ), 0)
           )::numeric
         , 4) AS duration_mins,
         -- Manual break: sum of non-screen-lock pauses
         ROUND(COALESCE((
           SELECT SUM(
             CASE
               WHEN ap.pause_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
               ELSE
                 EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
             END
           )
           FROM attendance_pauses ap
           WHERE ap.attendance_id = s.attendance_id
             AND ap.reason != 'screen_lock'
             AND ap.pause_start >= s.login_at
             AND (s.logout_at IS NULL OR ap.pause_start <= s.logout_at)
         ), 0)::numeric, 4) AS manual_break_mins,
         -- Screen-off: sum of screen_lock pauses (including active)
         ROUND(COALESCE((
           SELECT SUM(
             CASE
               WHEN ap.pause_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
               ELSE
                 EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
             END
           )
           FROM attendance_pauses ap
           WHERE ap.attendance_id = s.attendance_id
             AND ap.reason = 'screen_lock'
             AND ap.pause_start >= s.login_at
             AND (s.logout_at IS NULL OR ap.pause_start <= s.logout_at)
         ), 0)::numeric, 4) AS screen_off_mins
       FROM employee_sessions s
       WHERE s.employee_id = $1
         AND DATE(s.login_at AT TIME ZONE 'Asia/Kolkata') = $2
       ORDER BY s.login_at ASC`,
      [employeeId, date]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}
// Employee: get ALL their pauses grouped by attendance_id for a date range
const getMyPausesRange = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const { from, to } = req.query
    const now = new Date()
    const fromDate = from || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const toDate   = to   || now.toISOString().split('T')[0]

    const { rows } = await query(
      `SELECT
         ap.id,
         ap.attendance_id,
         ap.reason,
         ap.comment,
         ap.pause_start,
         ap.pause_end,
         ap.duration_mins,
         a.date
       FROM attendance_pauses ap
       JOIN attendance a ON ap.attendance_id = a.id
       WHERE a.employee_id = $1
         AND a.date >= $2
         AND a.date <= $3
       ORDER BY ap.pause_start ASC`,
      [employee.id, fromDate, toDate]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}
const getTodayAll = async (req, res, next) => {
  try {
    // Allow ?date=YYYY-MM-DD — defaults to today
    const date = req.query.date || new Date().toISOString().split('T')[0]
    const { rows } = await query(
      `SELECT
         e.id          AS employee_id,
         e.employee_id AS emp_code,
         e.first_name,
         e.last_name,
         e.designation,
         e.avatar_url,
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
      [date]
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
  pauseWork, resumeWork, getMyPauses, getMyPausesRange, getPausesByAttendance,
  getToday, getMy, getMySummary,
  getWeeklyBreakdown, getHolidays, getTodayAll,
  getByEmployee, getSummaryByEmployee,
  getSessionsByEmployee,
}
