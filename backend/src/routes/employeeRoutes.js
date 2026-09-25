const router = require('express').Router()
const ctrl   = require('../controllers/employeeController')
const { authenticate }  = require('../middleware/authMiddleware')
const { authorize }     = require('../middleware/roleMiddleware')
const { uploadAvatar, uploadDocument, uploadVerifyDocs } = require('../middleware/uploadMiddleware')

router.use(authenticate)

router.get('/my',                ctrl.getMyProfile)
router.put('/my',                ctrl.updateMyProfile)
router.post('/my/upload-doc',    uploadDocument, ctrl.uploadMissingDoc)   // upload missing doc
router.get('/team',              authorize('admin'), ctrl.getTeam)
router.get('/verify-documents/check-id', ctrl.checkCompanyId)
router.post('/verify-documents', uploadVerifyDocs, ctrl.verifyDocuments)
router.get('/',                  authorize('admin', 'hr', 'superadmin', 'project_manager'), ctrl.getAll)
router.get('/:id',               ctrl.getById)
router.post('/',                 authorize('admin', 'hr', 'superadmin'), ctrl.create)
router.put('/:id',               authorize('admin', 'hr', 'superadmin'), ctrl.update)
router.delete('/:id',            authorize('admin', 'hr', 'superadmin'), ctrl.remove)
router.post('/:id/avatar',       uploadAvatar, ctrl.uploadAvatar)

module.exports = router



