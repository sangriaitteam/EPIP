const router = require('express').Router()
const ctrl   = require('../controllers/adminController')
const notifCtrl = require('../controllers/notificationController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)
router.use(authorize('admin', 'superadmin'))

// Departments
router.get('/departments',        ctrl.getDepartments)
router.post('/departments',       ctrl.createDepartment)
router.put('/departments/:id',    ctrl.updateDepartment)
router.delete('/departments/:id', ctrl.deleteDepartment)

// Users
router.get('/users',              ctrl.getUsers)
router.get('/admins',             ctrl.getAdmins)           // list hr admins
router.post('/create-admin',      ctrl.createAdmin)
router.delete('/admins/:id',      ctrl.deleteAdmin)          // permanently delete hr admin
router.put('/users/:id',          ctrl.updateUser)
router.patch('/users/:id/deactivate', ctrl.deactivateUser)

// Project Managers
router.get('/project-managers',           ctrl.getProjectManagers)
router.post('/create-project-manager',    ctrl.createProjectManager)
router.delete('/project-managers/:id',    ctrl.deleteProjectManager)

// Settings
router.get('/settings',           ctrl.getSettings)
router.put('/settings',           ctrl.updateSettings)

// Holidays
router.get('/holidays',           ctrl.getHolidays)
router.post('/holidays',          ctrl.createHoliday)
router.delete('/holidays/:id',    ctrl.deleteHoliday)

// Shifts
router.get('/shifts',             ctrl.getShifts)
router.post('/shifts',            ctrl.createShift)
router.put('/shifts/:id',         ctrl.updateShift)
router.delete('/shifts/:id',      ctrl.deleteShift)

// Audit logs
router.get('/audit-logs',         ctrl.getAuditLogs)

module.exports = router
