const router = require('express').Router()
const ctrl   = require('../controllers/goalController')
const { authenticate }    = require('../middleware/authMiddleware')
const { authorize }       = require('../middleware/roleMiddleware')
const { uploadEvidence }  = require('../middleware/uploadMiddleware')

router.use(authenticate)

router.post('/',                  ctrl.create)
router.get('/my',                 ctrl.getMy)
router.get('/employee/:id',       authorize('admin','hr','superadmin'), ctrl.getByEmployee)
router.get('/department/:id',     authorize('admin','hr','superadmin'), ctrl.getByDepartment)
router.get('/:id',                ctrl.getById)
router.put('/:id',                ctrl.update)
router.patch('/:id/approve',      authorize('admin','hr','superadmin'), ctrl.approve)
router.post('/:id/evidence',      uploadEvidence, ctrl.uploadEvidence)
router.delete('/:id',             ctrl.remove)

module.exports = router


