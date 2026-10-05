const router = require('express').Router()
const ctrl   = require('../controllers/taskController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')
const { uploadAttachment } = require('../middleware/uploadMiddleware')

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
router.delete('/:id',          authorize('admin','hr','superadmin','project_manager','employee'), ctrl.remove)
router.post('/:id/comments',   uploadAttachment, ctrl.addComment)
router.get('/:id/comments',    ctrl.getComments)
router.patch('/:id/comments/read', ctrl.markCommentsRead)

module.exports = router


