const router = require('express').Router()
const ctrl   = require('../controllers/projectController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

// Employee: view their own assigned projects
router.get('/my',     authorize('employee', 'hr', 'project_manager', 'admin', 'superadmin'), ctrl.getMyProjects)

// Project Managers can view projects (read-only), admin/superadmin can also create/edit/delete
router.get('/',       authorize('admin', 'superadmin', 'hr', 'project_manager'), ctrl.getAll)
router.post('/',      authorize('admin', 'superadmin', 'project_manager'), ctrl.create)
router.put('/:id',    authorize('admin', 'superadmin', 'project_manager', 'employee'), ctrl.update)
router.delete('/:id', authorize('admin', 'superadmin'), ctrl.remove)

module.exports = router
