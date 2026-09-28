const router = require('express').Router()
const ctrl   = require('../controllers/projectController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)

router.get('/my',        ctrl.getMy)
router.get('/',          ctrl.getAll)
router.get('/:id',       ctrl.getById)
router.get('/:id/reports', ctrl.getReports)
router.post('/:id/reports', ctrl.generateReport)
router.post('/',         ctrl.create)
router.put('/:id',       ctrl.update)
router.delete('/:id',    authorize('admin','hr','superadmin','project_manager'), ctrl.remove)

module.exports = router
