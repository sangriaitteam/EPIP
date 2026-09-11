const router = require('express').Router()
const ctrl   = require('../controllers/leaveController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

// Employee
router.post('/',        ctrl.requestLeave)          // submit leave
router.get('/my',       ctrl.getMyLeaves)            // own history
router.delete('/:id',   ctrl.cancelLeave)            // cancel pending

// HR / Admin
router.get('/',         authorize('hr','admin','superadmin'), ctrl.getAllLeaves)   // all leaves
router.patch('/:id',    authorize('hr','admin','superadmin'), ctrl.reviewLeave)   // approve/reject

module.exports = router
