const router = require('express').Router()
const ctrl   = require('../controllers/notificationController')
const { authenticate } = require('../middleware/authMiddleware')

router.use(authenticate)

router.get('/',              ctrl.getAll)
router.get('/count',         ctrl.unreadCount)
router.patch('/read-all',    ctrl.markAllRead)
router.patch('/:id/read',    ctrl.markRead)

module.exports = router
