const router = require('express').Router()
const ctrl   = require('../controllers/selfAssessmentController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.post('/',             ctrl.save)
router.get('/',              authorize('admin','hr','superadmin'), ctrl.getAll)
router.get('/my',            ctrl.getMy)
router.get('/employee/:id',  authorize('admin','hr','superadmin'), ctrl.getByEmployee)
router.post('/:id/submit',   ctrl.submit)

module.exports = router


