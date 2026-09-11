const router = require('express').Router()
const ctrl   = require('../controllers/screenshotController')
const { authenticate }    = require('../middleware/authMiddleware')
const { authorize }       = require('../middleware/roleMiddleware')
const { uploadScreenshot } = require('../middleware/uploadMiddleware')

router.use(authenticate)

router.post('/my',                    uploadScreenshot, ctrl.uploadMy)  // employee uploads own
router.post('/upload',                uploadScreenshot, ctrl.upload)
router.get('/',                       authorize('admin','hr','superadmin'), ctrl.getAll)
router.get('/employee/:id',           authorize('admin','hr','superadmin'), ctrl.getByEmployee)
router.get('/count/today/:employeeId',authorize('admin','hr','superadmin'), ctrl.countToday)

module.exports = router


