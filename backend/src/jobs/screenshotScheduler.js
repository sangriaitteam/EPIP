/**
 * screenshotScheduler.js
 *
 * In Phase 1 the screenshot is captured by a browser extension or
 * desktop agent (Phase 2 scope) and POSTed to POST /api/screenshots/upload.
 *
 * This scheduler handles:
 *   1. Sending reminder notifications if no screenshot received in interval
 *   2. Cleaning up old screenshot files daily
 *   3. Marking employees as away if no activity detected
 */

const { query }        = require('../config/db')
const Screenshot       = require('../models/Screenshot')
const Notification     = require('../models/Notification')
const { cleanOldScreenshots } = require('../services/storageService')

const INTERVAL_MS = (parseInt(process.env.SCREENSHOT_INTERVAL_MINUTES) || 10) * 60 * 1000

let screenshotTimer  = null
let cleanupTimer     = null
let midnightTimer    = null

// ── Check-in activity monitor ──────────────────────────────────────────────
const checkActivity = async () => {
  try {
    const now  = new Date()
    const hour = now.getHours()

    // Only run during work hours 09:00–18:00
    if (hour < 9 || hour >= 18) return

    const today = now.toISOString().split('T')[0]

    // Get all employees currently checked in today
    const { rows: active } = await query(
      `SELECT a.employee_id, e.user_id,
              e.first_name || ' ' || e.last_name AS name
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.date = $1 AND a.check_in IS NOT NULL AND a.check_out IS NULL`,
      [today]
    )

    for (const emp of active) {
      const count = await Screenshot.countToday(emp.employee_id)
      const expected = Math.floor(((hour - 9) * 60) / (parseInt(process.env.SCREENSHOT_INTERVAL_MINUTES) || 10))

      // If significantly behind — notify
      if (expected > 0 && count === 0 && emp.user_id) {
        await Notification.create({
          user_id: emp.user_id,
          type:    'system',
          title:   'Screenshot Agent Inactive',
          message: 'No screenshots detected today. Please ensure the EPIP agent is running.',
        }).catch(() => {})
      }
    }
    console.log(`[SCHEDULER] Activity check complete — ${active.length} active employees`)
  } catch (err) {
    console.error('[SCHEDULER] Activity check error:', err.message)
  }
}

// ── Daily cleanup ──────────────────────────────────────────────────────────
const dailyCleanup = async () => {
  try {
    // Clean screenshots older than 30 days
    const deleted = cleanOldScreenshots(30)

    // Clean old notifications (> 30 days)
    await Notification.deleteOld(30)

    console.log(`[SCHEDULER] Daily cleanup — removed ${deleted} screenshots`)
  } catch (err) {
    console.error('[SCHEDULER] Cleanup error:', err.message)
  }
}

// ── Midnight Finalize — closes all open sessions at 11:58 PM ─────────────────
// Runs every minute. At 23:58 IST closes open sessions + calculates final hours.
// This ensures day totals are correct even if employee forgot to logout.
const midnightFinalize = async () => {
  try {
    const now  = new Date()
    // ── Use IST time (UTC+5:30) for midnight check ────────────────────────
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)
    const h    = istNow.getUTCHours()
    const m    = istNow.getUTCMinutes()

    // Fire at 23:58 IST only
    if (h !== 23 || m !== 58) return

    // Use IST date for today
    const today = istNow.toISOString().split('T')[0]
    console.log(`[SCHEDULER] Midnight finalize starting for ${today}`)

    // 1. Close all open attendance_pauses (end any active screen-off/break)
    await query(
      `UPDATE attendance_pauses
       SET pause_end     = NOW(),
           duration_mins = ROUND(EXTRACT(EPOCH FROM (NOW() - pause_start)) / 60, 2)
       WHERE pause_end IS NULL
         AND DATE(pause_start AT TIME ZONE 'Asia/Kolkata') = $1`,
      [today]
    )

    // 2. Close all open employee_sessions
    const { rows: openSessions } = await query(
      `SELECT s.id, s.login_at, s.employee_id, s.attendance_id
       FROM employee_sessions s
       WHERE s.logout_at IS NULL
         AND DATE(s.login_at AT TIME ZONE 'Asia/Kolkata') = $1`,
      [today]
    )

    for (const sess of openSessions) {
      // Calc manual + screen-off mins for this session
      const { rows: breakRows } = await query(
        `SELECT reason, COALESCE(duration_mins, 0) AS duration_mins
         FROM attendance_pauses
         WHERE attendance_id = $1
           AND pause_start >= $2
           AND pause_end IS NOT NULL`,
        [sess.attendance_id, sess.login_at]
      )
      const manualMins = breakRows
        .filter(p => p.reason !== 'screen_lock')
        .reduce((s, p) => s + parseFloat(p.duration_mins), 0)
      const screenMins = breakRows
        .filter(p => p.reason === 'screen_lock')
        .reduce((s, p) => s + parseFloat(p.duration_mins), 0)
      const totalElapsed = Math.floor((Date.now() - new Date(sess.login_at).getTime()) / 60000)
      const workMins = Math.max(0, totalElapsed - manualMins - screenMins)

      await query(
        `UPDATE employee_sessions
         SET logout_at = NOW(),
             logout_type = 'midnight',
             duration_mins = $1,
             manual_break_mins = $2,
             screen_off_mins = $3
         WHERE id = $4`,
        [workMins, manualMins, screenMins, sess.id]
      )
    }

    // 3. Recalc hours_worked for all attendance records today
    const { rows: attRows } = await query(
      `SELECT id, employee_id FROM attendance WHERE date = $1 AND check_out IS NULL`,
      [today]
    )

    for (const att of attRows) {
      const { rows: sessionTotals } = await query(
        `SELECT COALESCE(SUM(
           GREATEST(0,
             EXTRACT(EPOCH FROM (COALESCE(s.logout_at, NOW()) - s.login_at)) / 60
             -- subtract screen_lock pauses only (screen off = not working time)
             -- manual breaks are intentional breaks, still count toward session elapsed
             - COALESCE((
                 SELECT SUM(CASE WHEN ap.pause_end IS NOT NULL
                   THEN EXTRACT(EPOCH FROM (ap.pause_end - ap.pause_start)) / 60
                   ELSE 0 END)
                 FROM attendance_pauses ap
                 WHERE ap.attendance_id = s.attendance_id
                   AND ap.reason = 'screen_lock'
                   AND ap.pause_start >= s.login_at
               ), 0)
           )
         ), 0) AS total_work_mins
         FROM employee_sessions s
         WHERE s.employee_id = $1
           AND DATE(s.login_at AT TIME ZONE 'Asia/Kolkata') = $2`,
        [att.employee_id, today]
      )
      const totalWorkMins = parseFloat(sessionTotals[0]?.total_work_mins || 0)
      const totalWorkHrs  = Math.round((totalWorkMins / 60) * 100) / 100
      const otHrs = Math.max(0, Math.round((totalWorkHrs - 9) * 100) / 100)

      await query(
        `UPDATE attendance
         SET hours_worked = $1, overtime = $2, check_out = NOW(), updated_at = NOW()
         WHERE id = $3`,
        [totalWorkHrs, otHrs, att.id]
      )
    }

    console.log(`[SCHEDULER] Midnight finalize complete — closed ${openSessions.length} sessions, ${attRows.length} attendance records updated`)
  } catch (err) {
    console.error('[SCHEDULER] Midnight finalize error:', err.message)
  }
}

// ── Start / Stop ──────────────────────────────────────────────────────────
const start = () => {
  screenshotTimer = setInterval(checkActivity, INTERVAL_MS)

  // Daily cleanup at midnight (24 hours)
  cleanupTimer = setInterval(dailyCleanup, 24 * 60 * 60 * 1000)

  // Run cleanup once on start
  dailyCleanup()

  // ── Midnight session finalize — runs every minute, closes open sessions at 11:58 PM ──
  midnightTimer = setInterval(midnightFinalize, 60 * 1000)

  console.log(`[SCHEDULER] Started — interval: ${INTERVAL_MS / 60000} min`)
}

const stop = () => {
  if (screenshotTimer) clearInterval(screenshotTimer)
  if (cleanupTimer)    clearInterval(cleanupTimer)
  if (midnightTimer)   clearInterval(midnightTimer)
  console.log('[SCHEDULER] Stopped')
}

module.exports = { start, stop }
