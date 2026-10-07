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
    // Only count as re-login warning if NOT triggered by tab-close auto-checkout
    // tab_close flag sent by frontend sendBeacon — those are legitimate closures
    const isTabClose  = req.body?.tab_close === true
    let isReLogin     = reLoginCount > 0 && !isTabClose

    // Check-in (upsert attendance row — allows re-login same day)
    const record = await Attendance.checkIn({ employee_id: employee.id, work_mode, allowReLogin: true })

    // ── Close ALL stale open pauses (from any previous session/day) ──────────
    // Prevents old unclosed screen-lock pauses from leaking into new sessions
    // ── Also close any sessions from PREVIOUS days that are still open ──────
    await query(
      `UPDATE employee_sessions
       SET logout_at = DATE_TRUNC('day', login_at) + INTERVAL '23 hours 58 minutes',
           duration_mins = GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM (
               DATE_TRUNC('day', login_at) + INTERVAL '23 hours 58 minutes' - login_at
             )) / 60, 2))
       WHERE employee_id = $1
         AND logout_at IS NULL
         AND DATE(login_at AT TIME ZONE 'Asia/Kolkata') < $2`,
      [employee.id, today]
    )
    // Delete ALL stuck open screen_lock pauses — no resume = unknown unlock time
    // Deleting prevents inflated screen_off on re-login sessions
    await query(
      `DELETE FROM attendance_pauses ap
       USING attendance a
       WHERE ap.attendance_id = a.id
         AND a.employee_id = $1
         AND ap.pause_end IS NULL
         AND ap.reason = 'screen_lock'`,
      [employee.id]
    )
    await query(
      `UPDATE attendance_pauses
       SET pause_end     = NOW(),
           duration_mins = ROUND(EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60, 2)
       WHERE employee_id = $1
         AND pause_end IS NULL
         AND attendance_id != $2`,
      [employee.id, record.id]
    )
    // Close ALL open pauses on today's attendance — no time guard.
    // A new login means the employee is at their desk, so any open pause
    // (screen_lock or otherwise) that is still open must be closed right now.
    // The old INTERVAL '1 minute' guard was wrong: it left pauses that started
    // within the last minute open, causing screen-off to keep growing after login.
    await query(
      `UPDATE attendance_pauses
       SET pause_end     = NOW(),
           duration_mins = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60, 2))
       WHERE employee_id = $1
         AND attendance_id = $2
         AND pause_end IS NULL`,
      [employee.id, record.id]
    )

    // Close any open sessions from today before creating a new one
    // Skip sessions < 30 seconds (micro sessions from tab close/open)
    const { rows: openSessions } = await query(
      `SELECT id, login_at, attendance_id FROM employee_sessions
       WHERE employee_id = $1 AND logout_at IS NULL AND attendance_id = $2`,
      [employee.id, record.id]
    )

    for (const sess of openSessions) {
      const elapsedSecs = Math.floor((Date.now() - new Date(sess.login_at).getTime()) / 1000)

      if (elapsedSecs < 30) {
        // Micro session (< 30 sec) — delete it, don't count as re-login
        await query(`DELETE FROM employee_sessions WHERE id = $1`, [sess.id])
        // Also don't count as re-login warning
        isReLogin = false
        console.log(`[attendance] Skipped micro session ${sess.id} (${elapsedSecs}s)`)
      } else {
        // Real session — close it properly
        await query(
          `UPDATE employee_sessions
           SET logout_at = NOW(),
               duration_mins = GREATEST(0, ROUND(
                 EXTRACT(EPOCH FROM (NOW() - login_at)) / 60
               , 2)),
               manual_break_mins = COALESCE((
                 SELECT ROUND(SUM(
                   CASE WHEN ap.pause_end IS NOT NULL
                     THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                   ELSE 0 END
                 )::numeric, 2)
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = $2
                   AND ap.reason != 'screen_lock'
                   AND ap.pause_start >= employee_sessions.login_at
               ), 0),
               screen_off_mins = COALESCE((
                 SELECT ROUND(SUM(
                   CASE WHEN ap.pause_end IS NOT NULL
                     THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                   ELSE 0 END
                 )::numeric, 2)
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = $2
                   AND ap.reason = 'screen_lock'
                   AND ap.pause_start >= employee_sessions.login_at
               ), 0)
           WHERE id = $1`,
          [sess.id, record.id]
        )
      }
    }

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
      const LOCK_THRESHOLD = 10   // lock after 10 warnings (10+ manual re-login cycles)

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

    // ── Handle open screen_lock pauses at checkout ───────────────────────────
    // If screen was locked when employee logs out (and timing agent didn't resume),
    // DELETE the open pause — we don't know when screen actually turned ON.
    // Keeping it and closing at logout would inflate screen_off with invalid data.
    // The only accurate screen_off entries are those closed by resumeWork (exact timing).
    await query(
      `DELETE FROM attendance_pauses ap
       USING attendance a
       WHERE ap.attendance_id = a.id
         AND a.employee_id = $1
         AND ap.pause_end IS NULL
         AND ap.reason = 'screen_lock'`,
      [employee.id]
    )

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

    // Determine logout type — tab_close from sendBeacon, else manual
    const logoutType = req.body?.tab_close === true ? 'tab_close' : 'manual'

    // Close the latest open session
    // duration_mins = total elapsed minus screen-off AND manual breaks
    await query(
      `UPDATE employee_sessions
       SET logout_at         = NOW(),
           logout_type       = $3,
           manual_break_mins = $1,
           screen_off_mins   = $2,
           duration_mins     = GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM (NOW() - login_at)) / 60 - $1 - $2
           , 2))
       WHERE id = (
         SELECT id FROM employee_sessions
         WHERE employee_id = $4 AND logout_at IS NULL
         ORDER BY login_at DESC LIMIT 1
       )`,
      [manualMins, screenMins, logoutType, employee.id]
    )

    // Recalculate total work hours from ALL sessions today
    // Working Hours = session elapsed - screen_off - manual_breaks
    const { rows: sessionTotals } = await query(
      `SELECT COALESCE(SUM(
         GREATEST(0,
           EXTRACT(EPOCH FROM (s.logout_at - s.login_at)) / 60
           -- subtract screen_lock pauses (not working time)
           - COALESCE((
               SELECT SUM(EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60)
               FROM attendance_pauses ap
               WHERE ap.attendance_id = s.attendance_id
                 AND ap.reason = 'screen_lock'
                 AND ap.pause_end IS NOT NULL
                 AND ap.pause_start >= s.login_at
                 AND ap.pause_start < s.logout_at
             ), 0)
           -- subtract manual break pauses
           - COALESCE((
               SELECT SUM(
                 GREATEST(0, EXTRACT(EPOCH FROM (
                   LEAST(ap.pause_end, s.logout_at)
                   - GREATEST(ap.pause_start, s.login_at)
                 )) / 60)
               FROM attendance_pauses ap
               WHERE ap.attendance_id = s.attendance_id
                 AND ap.reason != 'screen_lock'
                 AND ap.pause_end IS NOT NULL
                 AND ap.pause_start >= s.login_at
                 AND ap.pause_start < s.logout_at
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

    const VALID_REASONS = ['tea_break', 'lunch_break', 'meeting', 'personal', 'other', 'screen_lock']
    const { reason = 'other', comment } = req.body
    const resolvedReason = VALID_REASONS.includes(reason) ? reason : 'other'

    // ── Auto-close ALL existing open pauses before inserting a new one ────────
    // This handles:
    //   1. screen_lock pause from a previous session that was never resumed
    //   2. manual break that was never closed
    //   3. any stale pause from before re-login
    // Capped at the current session's login_at so stale pauses don't get
    // inflated durations.
    const { rows: currentSession } = await query(
      `SELECT login_at FROM employee_sessions
       WHERE employee_id = $1 AND logout_at IS NULL
       ORDER BY login_at DESC LIMIT 1`,
      [employee.id]
    )
    const sessionLoginAt = currentSession[0]?.login_at || record.check_in

    // Close open pauses that started BEFORE this session — cap them at session start
    await query(
      `UPDATE attendance_pauses
       SET pause_end     = $3::timestamptz,
           duration_mins = GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM ($3::timestamptz - pause_start)) / 60, 2))
       WHERE employee_id = $1
         AND attendance_id = $2
         AND pause_end IS NULL
         AND pause_start < $3::timestamptz`,
      [employee.id, record.id, sessionLoginAt]
    )

    // Close open pauses that started WITHIN this session (e.g. duplicate lock events)
    const existing = await Attendance.getActivePause(employee.id)
    if (existing) {
      if (resolvedReason === 'screen_lock' && existing.reason === 'screen_lock') {
        // Duplicate screen_lock from second agent — already on screen lock break, just return existing
        console.log('[attendance] Duplicate screen_lock pause ignored — already tracking')
        return ok(res, existing, 'Already on screen lock break')
      } else if (existing.reason === 'screen_lock' || resolvedReason === 'screen_lock') {
        // One is screen_lock, other is manual — close existing and start new
        await query(
          `UPDATE attendance_pauses
           SET pause_end = NOW(),
               duration_mins = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60, 2))
           WHERE id = $1`,
          [existing.id]
        )
      } else {
        return fail(res, 'Already on a break — resume first', 409)
      }
    }

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

    // Close ALL open pauses for this employee (not just one)
    // This handles cases where multiple pauses are stuck open from previous sessions
    const { rows: closedPauses } = await query(
      `UPDATE attendance_pauses ap
       SET pause_end     = NOW(),
           duration_mins = ROUND(
             -- Simple: elapsed from pause_start to NOW() — this is always correct
             -- because we're resuming RIGHT NOW, so NOW() is the exact end time.
             -- No cap needed: if a pause somehow started before the session that's
             -- a data integrity issue, not something to silently inflate.
             GREATEST(0, EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60)::numeric
           , 2)
       FROM attendance a
       WHERE ap.attendance_id = a.id
         AND a.employee_id = $1
         AND ap.pause_end IS NULL
       RETURNING ap.*`,
      [employee.id]
    )

    if (closedPauses.length === 0) return fail(res, 'No active break found', 404)

    // Update running total on attendance rows — MANUAL breaks only (not screen_lock)
    const attendanceIds = [...new Set(closedPauses.map(p => p.attendance_id))]
    for (const attId of attendanceIds) {
      await query(
        `UPDATE attendance
         SET total_pause_mins = COALESCE((
           SELECT ROUND(SUM(duration_mins)::numeric, 2)
           FROM attendance_pauses
           WHERE attendance_id = $1
             AND pause_end IS NOT NULL
             AND reason != 'screen_lock'
         ), 0),
         updated_at = NOW()
         WHERE id = $1`,
        [attId]
      )
    }

    return ok(res, closedPauses[0], 'Break ended — resumed work')
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

    // ── Auto-close stale pauses from before current session ───────────────────
    // If employee re-logged in (Session 2), any open pause from Session 1 that
    // wasn't closed at checkout must be capped at session 2's login time.
    // This runs silently on every poll so the timing-agent always gets clean state.
    if (record?.check_in && !record?.check_out) {
      await query(
        `UPDATE attendance_pauses ap
         SET pause_end     = s.login_at,
             duration_mins = GREATEST(0, ROUND(
               EXTRACT(EPOCH FROM (s.login_at - ap.pause_start)) / 60, 2))
         FROM (
           SELECT login_at FROM employee_sessions
           WHERE employee_id = $1 AND logout_at IS NULL
           ORDER BY login_at DESC LIMIT 1
         ) s
         WHERE ap.employee_id = $1
           AND ap.pause_end IS NULL
           AND ap.pause_start < s.login_at`,
        [employee.id]
      )
    }

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
    const istNow3 = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const date = req.query.date || istNow3.toISOString().split('T')[0]

    // ── Close pre-session stale open pauses ──────────────────────────────────
    // Only close pauses that started BEFORE current session login.
    // In-session open pauses (screen currently locked) are left open.
    await query(
      `UPDATE attendance_pauses ap
       SET pause_end     = s.login_at,
           duration_mins = GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM (s.login_at - ap.pause_start)) / 60, 2))
       FROM (
         SELECT es.login_at, es.attendance_id
         FROM employee_sessions es
         WHERE es.employee_id = $1
           AND es.logout_at IS NULL
           AND DATE(es.login_at AT TIME ZONE 'Asia/Kolkata') = $2
         ORDER BY es.login_at DESC LIMIT 1
       ) s
       WHERE ap.employee_id = $1
         AND ap.attendance_id = s.attendance_id
         AND ap.pause_end IS NULL
         AND ap.pause_start < s.login_at`,
      [employeeId, date]
    )

    const { rows } = await query(
      `SELECT
         s.id,
         s.employee_id,
         s.login_at,
         s.logout_at,
         s.logout_type,
         -- session elapsed
         GREATEST(0, ROUND(
           EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60::numeric
         , 4)) AS session_elapsed_mins,

         -- ── screen_off_mins ──────────────────────────────────────────────
         -- Closed pauses: exact stored duration.
         -- Currently open pause (screen still locked): live NOW()-pause_start.
         -- Hard cap: screen_off can never exceed session elapsed.
         LEAST(
           GREATEST(0, ROUND(COALESCE((
             SELECT SUM(
               CASE
                 -- Closed: use exact stored duration
                 WHEN ap.pause_end IS NOT NULL THEN
                   EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                 -- Open: screen currently locked → live counter
                 WHEN ap.pause_end IS NULL AND s.logout_at IS NULL THEN
                   EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
                 ELSE 0
               END
             )
             FROM attendance_pauses ap
             WHERE ap.attendance_id = s.attendance_id
               AND ap.reason = 'screen_lock'
               AND ap.pause_start >= s.login_at
           ), 0)::numeric, 4)),
           -- Hard cap: screen_off cannot exceed session elapsed
           GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60::numeric
           , 4))
         ) AS screen_off_mins,

         -- ── manual_break_mins ────────────────────────────────────────────
         LEAST(
           GREATEST(0, ROUND(COALESCE((
             SELECT SUM(
               CASE
                 WHEN ap.pause_end IS NOT NULL THEN
                   GREATEST(0, EXTRACT(EPOCH FROM (
                     LEAST(ap.pause_end, COALESCE(s.logout_at, NOW()))
                     - GREATEST(ap.pause_start, s.login_at)
                   )) / 60)
                 WHEN ap.pause_end IS NULL AND ap.pause_start >= s.login_at
                      AND s.logout_at IS NULL THEN
                   GREATEST(0, EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60)
                 ELSE 0
               END
             )
             FROM attendance_pauses ap
             WHERE ap.attendance_id = s.attendance_id
               AND ap.reason != 'screen_lock'
           ), 0)::numeric, 4)),
           GREATEST(0, ROUND(
             EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60::numeric
           , 4))
         ) AS manual_break_mins,

         -- ── duration_mins (Working Hours) ────────────────────────────────
         -- elapsed - screen_off - manual_breaks
         GREATEST(0, ROUND((
           EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
           - LEAST(
               GREATEST(0, COALESCE((
                 SELECT SUM(
                   CASE
                     WHEN ap.pause_end IS NOT NULL THEN
                       EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                     WHEN ap.pause_end IS NULL AND s.logout_at IS NULL THEN
                       EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
                     ELSE 0
                   END
                 )
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = s.attendance_id
                   AND ap.reason = 'screen_lock'
                   AND ap.pause_start >= s.login_at
               ), 0)),
               EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
             )
           - LEAST(
               GREATEST(0, COALESCE((
                 SELECT SUM(
                   CASE
                     WHEN ap.pause_end IS NOT NULL THEN
                       GREATEST(0, EXTRACT(EPOCH FROM (
                         LEAST(ap.pause_end, COALESCE(s.logout_at, NOW()))
                         - GREATEST(ap.pause_start, s.login_at)
                       )) / 60)
                     WHEN ap.pause_end IS NULL AND ap.pause_start >= s.login_at
                          AND s.logout_at IS NULL THEN
                       GREATEST(0, EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60)
                     ELSE 0
                   END
                 )
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = s.attendance_id
                   AND ap.reason != 'screen_lock'
               ), 0)),
               EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
             )
         )::numeric, 4)) AS duration_mins

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
    // Allow ?date=YYYY-MM-DD — defaults to today in IST
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const date = req.query.date || istNow.toISOString().split('T')[0]
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
         a.is_late,
         a.total_pause_mins,
         -- live_pause_mins: sum of ALL pauses including currently open ones
         COALESCE((
           SELECT ROUND(SUM(
             CASE
               WHEN ap.pause_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
               ELSE
                 EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
             END
           )::numeric, 2)
           FROM attendance_pauses ap
           WHERE ap.attendance_id = a.id
         ), 0) AS live_pause_mins,
         -- live_screen_off_mins: screen_lock pauses for this attendance record.
         -- Closed pauses: use exact stored duration.
         -- Active (open) pause: only count up to NOW() when check_out IS NULL
         --   (employee still checked in = screen currently OFF).
         -- When session is already closed (check_out IS NOT NULL), an open pause
         --   is stale — cap it at check_out so it doesn't keep growing.
         LEAST(
           COALESCE((
             SELECT ROUND(SUM(
               CASE
                 WHEN ap.pause_end IS NOT NULL
                   THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                 -- Active pause + employee still checked in → live counter
                 WHEN a.check_out IS NULL
                   THEN EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
                 -- Active pause but already checked out → cap at check_out
                 ELSE
                   GREATEST(0, EXTRACT(EPOCH FROM (a.check_out - ap.pause_start)) / 60)
               END
             )::numeric, 2)
             FROM attendance_pauses ap
             WHERE ap.attendance_id = a.id
               AND ap.reason = 'screen_lock'
           ), 0),
           -- Hard cap: can never exceed total session elapsed time
           COALESCE((
             SELECT ROUND(SUM(
               EXTRACT(EPOCH FROM (COALESCE(sess.logout_at, NOW()) - sess.login_at)) / 60
             )::numeric, 2)
             FROM employee_sessions sess
             WHERE sess.employee_id = e.id AND sess.attendance_id = a.id
           ), 0)
         ) AS live_screen_off_mins,
         -- active_screen_lock_start: timestamp when current screen lock started (NULL = not locked)
         (SELECT ap.pause_start
          FROM attendance_pauses ap
          WHERE ap.attendance_id = a.id
            AND ap.reason = 'screen_lock'
            AND ap.pause_end IS NULL
          ORDER BY ap.pause_start DESC LIMIT 1
         ) AS active_screen_lock_start
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

// GET /api/attendance/my-sessions?date=YYYY-MM-DD
// Employee: own sessions — login/logout/duration only. Screen-off HIDDEN.
const getMySessions = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const istNow2 = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const date = req.query.date || istNow2.toISOString().split('T')[0]

    const { rows } = await query(
      `SELECT
         s.id,
         s.login_at,
         s.logout_at,
         -- Live work duration: elapsed minus ALL pauses (screen+manual)
         ROUND(
           GREATEST(0,
             EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
             - COALESCE((
                 SELECT SUM(
                   CASE
                     WHEN ap.pause_end IS NOT NULL
                       THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                     ELSE EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
                   END
                 )
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = s.attendance_id
                   AND ap.pause_start >= s.login_at
                   AND (s.logout_at IS NULL OR ap.pause_start <= s.logout_at)
               ), 0)
           )::numeric
         , 2) AS duration_mins,
         -- Manual breaks only (employee can see these)
         ROUND(COALESCE((
           SELECT SUM(
             CASE
               WHEN ap.pause_end IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
               ELSE EXTRACT(EPOCH FROM (NOW() - ap.pause_start)) / 60
             END
           )
           FROM attendance_pauses ap
           WHERE ap.attendance_id = s.attendance_id
             AND ap.reason != 'screen_lock'
             AND ap.pause_start >= s.login_at
             AND (s.logout_at IS NULL OR ap.pause_start <= s.logout_at)
         ), 0)::numeric, 2) AS manual_break_mins
         -- NOTE: screen_off_mins intentionally omitted for employee privacy
       FROM employee_sessions s
       WHERE s.employee_id = $1
         AND DATE(s.login_at AT TIME ZONE 'Asia/Kolkata') = $2
       ORDER BY s.login_at ASC`,
      [employee.id, date]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

module.exports = {
  checkIn, checkOut,
  pauseWork, resumeWork, getMyPauses, getMyPausesRange, getPausesByAttendance,
  getToday, getMy, getMySummary,
  getWeeklyBreakdown, getHolidays, getTodayAll,
  getByEmployee, getSummaryByEmployee,
  getSessionsByEmployee, getMySessions,
}
