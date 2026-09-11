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

// ── Start / Stop ──────────────────────────────────────────────────────────
const start = () => {
  screenshotTimer = setInterval(checkActivity, INTERVAL_MS)

  // Daily cleanup at midnight (24 hours)
  cleanupTimer = setInterval(dailyCleanup, 24 * 60 * 60 * 1000)

  // Run cleanup once on start
  dailyCleanup()

  console.log(`[SCHEDULER] Started — interval: ${INTERVAL_MS / 60000} min`)
}

const stop = () => {
  if (screenshotTimer) clearInterval(screenshotTimer)
  if (cleanupTimer)    clearInterval(cleanupTimer)
  console.log('[SCHEDULER] Stopped')
}

module.exports = { start, stop }
