const router = require('express').Router()
const ctrl   = require('../controllers/dailyReportController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.post('/',                ctrl.submitToday)
router.get('/today',            ctrl.getToday)
router.get('/my',               ctrl.getMy)
router.get('/',                 authorize('admin','hr','superadmin'), ctrl.getAll)
router.get('/employee/:id',     authorize('admin','hr','superadmin'), ctrl.getByEmployee)

module.exports = router
