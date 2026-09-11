const router = require('express').Router()
const ctrl   = require('../controllers/taskController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.post('/',               authorize('admin','hr','superadmin'), ctrl.create)
router.get('/my',              ctrl.getMy)
router.get('/team',            authorize('admin','hr','superadmin'), ctrl.getTeamTasks)
router.get('/:id',             ctrl.getById)
router.put('/:id',             authorize('admin','hr','superadmin'), ctrl.update)
router.patch('/:id/status',    ctrl.updateStatus)
router.delete('/:id',          authorize('admin','hr','superadmin'), ctrl.remove)
router.post('/:id/comments',   ctrl.addComment)
router.get('/:id/comments',    ctrl.getComments)

module.exports = router


