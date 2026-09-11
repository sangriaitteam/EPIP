const router = require('express').Router()
const ctrl   = require('../controllers/reportController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)
router.use(authorize('admin','hr','superadmin'))

// Per-employee reports (4 types)
router.get('/employee/:id/attendance',  ctrl.employeeAttendance)
router.get('/employee/:id/performance', ctrl.employeePerformance)
router.get('/employee/:id/tasks',       ctrl.employeeTasks)
router.get('/employee/:id/kpi',         ctrl.employeeKPI)

// Legacy
router.get('/attendance',  ctrl.attendanceReport)
router.get('/summary',     ctrl.companySummary)

module.exports = router
