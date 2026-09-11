const router = require('express').Router()
const ctrl   = require('../controllers/performanceController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.post('/',                   authorize('admin','hr','superadmin'), ctrl.create)
router.get('/',                    authorize('admin','hr','superadmin'), ctrl.getAll)
router.get('/my',                  ctrl.getMy)
router.get('/params/default',      ctrl.getDefaultParams)
router.get('/employee/:id',        authorize('admin','hr','superadmin'), ctrl.getByEmployee)
router.get('/:id',                 ctrl.getById)
router.put('/:id/submit',          authorize('admin','hr','superadmin'), ctrl.submitReview)
router.patch('/:id/hr-approve',    authorize('admin','hr','superadmin'), ctrl.hrApprove)

module.exports = router


