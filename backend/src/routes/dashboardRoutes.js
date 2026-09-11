const router = require('express').Router()
const ctrl   = require('../controllers/dashboardController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.get('/employee',  ctrl.employeeDashboard)
router.get('/manager',   authorize('admin','hr','superadmin'), ctrl.managerDashboard)
router.get('/hr',        authorize('admin','hr','superadmin'), ctrl.hrDashboard)

module.exports = router


