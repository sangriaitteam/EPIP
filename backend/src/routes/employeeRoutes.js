const router = require('express').Router()
const ctrl   = require('../controllers/employeeController')
const { authenticate }  = require('../middleware/authMiddleware')
const { authorize }     = require('../middleware/roleMiddleware')
const { uploadAvatar, uploadVerifyDocs } = require('../middleware/uploadMiddleware')

router.use(authenticate)

router.get('/my',                ctrl.getMyProfile)
router.put('/my',                ctrl.updateMyProfile)
router.get('/team',              authorize('admin'), ctrl.getTeam)
router.get('/verify-documents/check-id', ctrl.checkCompanyId)  // duplicate check
router.post('/verify-documents', uploadVerifyDocs, ctrl.verifyDocuments)  // multipart — must be before /:id
router.get('/',                  authorize('admin', 'hr', 'superadmin'), ctrl.getAll)
router.get('/:id',               ctrl.getById)
router.post('/',                 authorize('admin', 'hr', 'superadmin'), ctrl.create)
router.put('/:id',               authorize('admin', 'hr', 'superadmin'), ctrl.update)
router.delete('/:id',            authorize('admin', 'hr', 'superadmin'), ctrl.remove)
router.post('/:id/avatar',       uploadAvatar, ctrl.uploadAvatar)

module.exports = router


