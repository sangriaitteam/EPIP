const router  = require('express').Router()
const ctrl    = require('../controllers/idCardController')
const { authenticate }       = require('../middleware/authMiddleware')
const { authorize }          = require('../middleware/roleMiddleware')
const { uploadAvatar }       = require('../middleware/uploadMiddleware')

router.use(authenticate)

// ── Templates (any logged-in user can view active templates) ──────────────────
router.get('/templates',      ctrl.getTemplates)

// ── Templates (admin only) ────────────────────────────────────────────────────
router.get('/templates/all',  authorize('admin','hr','superadmin'), ctrl.getAllTemplates)
router.post('/templates',     authorize('admin','superadmin'),      ctrl.createTemplate)
router.put('/templates/:id',  authorize('admin','superadmin'),      ctrl.updateTemplate)
router.delete('/templates/:id', authorize('admin','superadmin'),    ctrl.deleteTemplate)

// ── Employee card routes ──────────────────────────────────────────────────────
router.get('/my',       authorize('employee','hr'), ctrl.getMyCard)
router.post('/generate',
  authorize('employee','hr'),
  uploadAvatar,
  ctrl.generateCard
)

module.exports = router
