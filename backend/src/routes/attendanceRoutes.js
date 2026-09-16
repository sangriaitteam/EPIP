const router = require('express').Router()
const ctrl   = require('../controllers/attendanceController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')
const { query }        = require('../config/db')
const { ok }           = require('../utils/response')

router.use(authenticate)

// GET /api/attendance/agent-config — employee can fetch their screenshot interval
// This is the only setting employees need from the agent
router.get('/agent-config', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT key, value FROM system_settings WHERE key IN ('screenshot_interval_minutes','screenshot_interval','screenshot_enabled')`
    )
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    const interval = parseInt(settings.screenshot_interval_minutes || settings.screenshot_interval || 10)
    const enabled  = settings.screenshot_enabled !== 'false'
    return ok(res, { interval_minutes: interval, enabled })
  } catch (err) { next(err) }
})

router.post('/check-in',                    ctrl.checkIn)
router.post('/check-out',                   ctrl.checkOut)
router.post('/pause',                       ctrl.pauseWork)
router.post('/resume',                      ctrl.resumeWork)
router.get('/pauses',                       ctrl.getMyPauses)
router.get('/pauses/:attendanceId', authorize('admin','hr','superadmin'), ctrl.getPausesByAttendance)
router.get('/today',                        ctrl.getToday)
router.get('/my',                           ctrl.getMy)
router.get('/summary',                      ctrl.getMySummary)
router.get('/holidays',                     ctrl.getHolidays)
router.get('/weekly',                       ctrl.getWeeklyBreakdown)
router.get('/employee/:id', authorize('admin','hr','superadmin'), ctrl.getByEmployee)
router.get('/employee/:id/summary', authorize('admin','hr','superadmin'), ctrl.getSummaryByEmployee)
router.get('/today-all',   authorize('admin','hr','superadmin'), ctrl.getTodayAll)

module.exports = router


