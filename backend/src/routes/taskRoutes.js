const router = require('express').Router()
const ctrl   = require('../controllers/taskController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.post('/',               authorize('admin','hr','superadmin','project_manager'), ctrl.create)
router.get('/my',                    ctrl.getMy)
router.get('/team-updates',         authorize('admin','hr','superadmin','project_manager'), ctrl.getTeamUpdates)
router.get('/team',                  authorize('admin','hr','superadmin','project_manager'), ctrl.getTeamTasks)
router.get('/by-project/:projectId', authorize('admin','hr','superadmin','project_manager'), ctrl.getByProject)
router.get('/:id',             ctrl.getById)
router.put('/:id',             authorize('admin','hr','superadmin','project_manager'), ctrl.update)
router.patch('/:id/status',      ctrl.updateStatus)
router.patch('/:id/completion',  ctrl.updateCompletion)
router.delete('/:id',          authorize('admin','hr','superadmin','project_manager'), ctrl.remove)
router.post('/:id/comments',   ctrl.addComment)
router.get('/:id/comments',    ctrl.getComments)

module.exports = router


