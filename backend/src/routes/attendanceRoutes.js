const router = require('express').Router()
const ctrl   = require('../controllers/attendanceController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

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


