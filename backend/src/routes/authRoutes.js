const router = require('express').Router()
const {
  login, register, me, changePassword, completeFirstLogin,
  superAdminRequestOtp, verifySuperAdminOtp, superAdminCreatePassword,
} = require('../controllers/authController')
const { authenticate }  = require('../middleware/authMiddleware')
const { authorize }     = require('../middleware/roleMiddleware')
const { body }          = require('express-validator')
const validate          = require('../utils/validate')

router.post('/login',
  body('password').notEmpty(),
  validate,
  login
)

router.post('/register',
  authenticate,
  authorize('admin'),
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'hr', 'employee']),
  validate,
  register
)

router.get('/me', authenticate, me)

router.patch('/complete-first-login', authenticate, completeFirstLogin)

// SuperAdmin: Email → OTP → Password (no auth required)
router.post('/superadmin/request-otp',     superAdminRequestOtp)
router.post('/superadmin/verify-otp',      verifySuperAdminOtp)
router.post('/superadmin/create-password', superAdminCreatePassword)

router.post('/change-password',
  authenticate,
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 6 }),
  validate,
  changePassword
)

module.exports = router
