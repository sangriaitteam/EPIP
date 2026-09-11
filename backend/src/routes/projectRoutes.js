const router = require('express').Router()
const ctrl   = require('../controllers/projectController')
const { authenticate } = require('../middleware/authMiddleware')
const { authorize }    = require('../middleware/roleMiddleware')

router.use(authenticate)
router.use(authorize('admin', 'superadmin'))

router.get('/',       ctrl.getAll)
router.post('/',      ctrl.create)
router.put('/:id',    ctrl.update)
router.delete('/:id', ctrl.remove)

module.exports = router
