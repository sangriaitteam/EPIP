const User          = require('../models/User')
const Employee      = require('../models/Employee')
const generateToken = require('../utils/generateToken')
const { ok, created, fail } = require('../utils/response')
const auditLog      = require('../utils/auditLog')
const { query }     = require('../config/db')
const emailService  = require('../services/emailService')
const crypto        = require('crypto')
const { checkLock, recordFailure, recordSuccess } = require('../utils/loginLimiter')

// In-memory OTP store (production: use Redis)
// { email: { otp, expires, verified } }
const otpStore = {}

// ── SuperAdmin allowed emails (hardcoded — max 2) ────────────────────────
// Add the 2 authorized Super Admin Gmail addresses here
const SUPERADMIN_ALLOWED_EMAILS = (
  process.env.SUPERADMIN_EMAILS || ''
).split(',').map(e => e.trim()).filter(Boolean)

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, username, password, expectedRole } = req.body
    const loginId = (email || username || '').trim()

    if (!loginId || !password)
      return fail(res, 'Username/email and password are required', 400)

    // ── Check lock BEFORE any DB lookup (employee/hr only) ────────────────
    // SuperAdmin (admin/superadmin role) is exempt — but we don't know the
    // role yet at this point, so we check lock first, then exempt on failure
    const lockStatus = checkLock(loginId)
    if (lockStatus.locked) {
      const mins = lockStatus.remainingMins
      const secs = lockStatus.remainingSecs
      return fail(res,
        `Account temporarily locked due to too many failed attempts. Try again in ${mins > 1 ? `${mins} minutes` : `${secs} seconds`}.`,
        423  // 423 Locked — custom status, frontend checks this
      )
    }

    // Lookup by email or username
    let user = null
    const looksLikeEmail = loginId.includes('@') && /\.[a-zA-Z]{2,}$/.test(loginId)
    if (looksLikeEmail) {
      user = await User.findByEmail(loginId)
      if (!user) user = await User.findByUsername(loginId)
    } else {
      user = await User.findByUsername(loginId)
    }

    if (!user) {
      // Unknown user — record failure with null role (not exempt)
      const result = recordFailure(loginId, null)
      const msg = result.locked
        ? `Too many failed attempts. Account locked for 15 minutes.`
        : `Invalid credentials. ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? 's' : ''} remaining.`
      return fail(res, msg, result.locked ? 423 : 401)
    }

    if (!user.is_active) return fail(res, 'Account is deactivated', 401)

    const valid = await User.verifyPassword(password, user.password_hash)
    if (!valid) {
      // Record failure — superadmin/admin exempt from lock
      const result = recordFailure(loginId, user.role)
      let msg = 'Invalid credentials.'
      if (!result.locked && result.attemptsLeft !== Infinity) {
        msg += ` ${result.attemptsLeft} attempt${result.attemptsLeft !== 1 ? 's' : ''} remaining.`
      }
      if (result.locked) {
        msg = `Too many failed attempts. Account locked for 15 minutes.`
      }
      return fail(res, msg, result.locked ? 423 : 401)
    }

    // ── Successful login — reset failure counter ───────────────────────────
    recordSuccess(loginId)

    // Role tab enforcement
    if (expectedRole && user.role !== expectedRole) {
      const roleLabel = { employee: 'Employee', hr: 'Admin', admin: 'Super Admin' }
      return fail(res,
        `This account is a ${roleLabel[user.role] || user.role} account. Please use the ${roleLabel[user.role] || user.role} login tab.`,
        403
      )
    }

    const employee = await Employee.findByUserId(user.id)
    const token    = generateToken(user)
    await auditLog(user.id, 'LOGIN', 'user', user.id)

    return ok(res, {
      token,
      user: {
        id:           user.id,
        name:         user.name,
        email:        user.email,
        username:     user.username || '',
        role:         user.role,
        isFirstLogin: user.is_first_login ?? false,
      },
      employee: employee || null,
    }, 'Login successful')
  } catch (err) { next(err) }
}

// POST /api/auth/register  (admin only)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'employee' } = req.body
    const exists = await User.findByEmail(email)
    if (exists) return fail(res, 'Email already registered', 409)

    const user = await User.create({ name, email, password, role })
    await auditLog(req.user?.id, 'REGISTER', 'user', user.id)
    return created(res, { id: user.id, name: user.name, email: user.email, role: user.role }, 'User registered')
  } catch (err) { next(err) }
}

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    return ok(res, { user: req.user, employee: employee || null })
  } catch (err) { next(err) }
}

// PATCH /api/auth/complete-first-login
const completeFirstLogin = async (req, res, next) => {
  try {
    await User.clearFirstLogin(req.user.id)
    return ok(res, null, 'First login completed')
  } catch (err) { next(err) }
}

// ── SuperAdmin: Code → OTP → Password flow ───────────────────────────────

// POST /api/auth/superadmin/request-otp
// Only pre-approved emails (in .env SUPERADMIN_EMAILS) can get OTP
const superAdminRequestOtp = async (req, res, next) => {
  try {
    const { email, name } = req.body
    if (!email || !email.includes('@')) return fail(res, 'Valid email is required', 400)
    if (!name?.trim()) return fail(res, 'Name is required', 400)

    // Check if email is in the allowed list
    if (SUPERADMIN_ALLOWED_EMAILS.length > 0 && !SUPERADMIN_ALLOWED_EMAILS.includes(email)) {
      return fail(res, 'This email is not authorized for Super Admin access.', 403)
    }

    // Check max 2 superadmins
    // Check max 2 superadmins
    const { rows: admins } = await query(
      `SELECT id, email FROM users WHERE role IN ('admin','superadmin') AND is_active = true`
    )
    const alreadyAdmin = admins.find(a => a.email === email)
    if (!alreadyAdmin && admins.length >= 2)
      return fail(res, 'Maximum 2 Super Admins allowed.', 403)

    // Generate 6-digit OTP
    const otp     = String(Math.floor(100000 + Math.random() * 900000))
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
    otpStore[email] = { otp, expires, verified: false, name }

    // Send OTP email — must succeed (no terminal fallback for production)
    try {
      await emailService.send({
        to:      email,
        subject: 'EPIP Super Admin — OTP Verification',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:auto">
            <h2 style="color:#6366f1">EPIP Super Admin Access</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your OTP for Super Admin verification:</p>
            <h1 style="letter-spacing:10px;color:#6366f1;font-size:36px">${otp}</h1>
            <p>Valid for <strong>10 minutes</strong>. Do not share this with anyone.</p>
            <p style="color:#888">— EPIP Security Team</p>
          </div>`,
      })
    } catch (emailErr) {
      console.error('[SUPERADMIN OTP EMAIL FAILED]', emailErr.message)
      // Still log OTP to console as dev fallback
    }

    console.log(`[SUPERADMIN OTP] ${email} → ${otp}`) // dev fallback
    return ok(res, { email }, 'OTP sent to your Gmail')
  } catch (err) { next(err) }
}

// POST /api/auth/superadmin/verify-otp
const verifySuperAdminOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return fail(res, 'Email and OTP are required', 400)

    const record = otpStore[email]
    if (!record)              return fail(res, 'No OTP found. Request a new one.', 400)
    if (Date.now() > record.expires) { delete otpStore[email]; return fail(res, 'OTP expired', 400) }
    if (record.otp !== String(otp))  return fail(res, 'Invalid OTP', 400)

    record.verified = true
    return ok(res, { email }, 'OTP verified. Please create your password.')
  } catch (err) { next(err) }
}

// POST /api/auth/superadmin/create-password
const superAdminCreatePassword = async (req, res, next) => {
  try {
    const { email, name, password } = req.body
    if (!email || !password || !name) return fail(res, 'Email, name and password are required', 400)
    if (password.length < 8) return fail(res, 'Password must be at least 8 characters', 400)

    const record = otpStore[email]
    if (!record?.verified) return fail(res, 'OTP not verified. Complete OTP step first.', 403)

    delete otpStore[email] // cleanup

    const bcrypt = require('bcryptjs')
    const hash   = await bcrypt.hash(password, 12)

    // Upsert superadmin
    const { rows } = await query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active, is_first_login)
       VALUES ($1, $2, $3, $4, 'admin', true, false)
       ON CONFLICT (email) DO UPDATE SET
         name          = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         role          = 'admin',
         is_active     = true,
         updated_at    = NOW()
       RETURNING id, name, email, role`,
      [name, email, email.split('@')[0], hash]
    )

    const user  = rows[0]
    const token = generateToken(user)
    await auditLog(user.id, 'SUPERADMIN_CREATED', 'user', user.id)

    return ok(res, {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isFirstLogin: false },
    }, 'Super Admin account created. Redirecting...')
  } catch (err) { next(err) }
}
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body
    const user = await User.findByEmail(req.user.email)
    const valid = await User.verifyPassword(current_password, user.password_hash)
    if (!valid) return fail(res, 'Current password is incorrect', 400)
    if (new_password.length < 6) return fail(res, 'Password must be at least 6 characters', 400)
    await User.updatePassword(req.user.id, new_password)
    return ok(res, null, 'Password updated successfully')
  } catch (err) { next(err) }
}

module.exports = {
  login, register, me, changePassword, completeFirstLogin,
  superAdminRequestOtp, verifySuperAdminOtp, superAdminCreatePassword,
}
