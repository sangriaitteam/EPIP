const Department  = require('../models/Department')
const User        = require('../models/User')
const Employee    = require('../models/Employee')
const Notification = require('../models/Notification')
const { query }   = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const auditLog    = require('../utils/auditLog')

// ── Departments ────────────────────────────────────────────────────────────

// GET /api/admin/departments
const getDepartments = async (req, res, next) => {
  try {
    const depts = await Department.findAll()
    return ok(res, depts)
  } catch (err) { next(err) }
}

// POST /api/admin/departments
const createDepartment = async (req, res, next) => {
  try {
    const { name, head_id, color } = req.body
    if (!name) return fail(res, 'Department name is required', 400)
    const dept = await Department.create({ name, head_id, color })
    await auditLog(req.user.id, 'CREATE_DEPARTMENT', 'department', dept.id)
    return created(res, dept, 'Department created')
  } catch (err) { next(err) }
}

// PUT /api/admin/departments/:id
const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.update(req.params.id, req.body)
    if (!dept) return fail(res, 'Department not found', 404)
    return ok(res, dept, 'Department updated')
  } catch (err) { next(err) }
}

// DELETE /api/admin/departments/:id
const deleteDepartment = async (req, res, next) => {
  try {
    await Department.delete(req.params.id)
    await auditLog(req.user.id, 'DELETE_DEPARTMENT', 'department', req.params.id)
    return ok(res, null, 'Department deleted')
  } catch (err) { next(err) }
}

// ── Users ──────────────────────────────────────────────────────────────────

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll(req.query)
    return ok(res, users)
  } catch (err) { next(err) }
}

// DELETE /api/admin/admins/:id  — permanently delete an hr admin
const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params
    const { rows } = await query(
      `SELECT id, role FROM users WHERE id = $1`, [id]
    )
    if (!rows.length) return fail(res, 'User not found', 404)
    if (rows[0].role !== 'hr') return fail(res, 'Can only delete Admin (hr) users', 403)

    // Clean related data before deleting
    await query(`DELETE FROM notifications WHERE user_id = $1`, [id])
    await query(`DELETE FROM audit_logs    WHERE user_id = $1`, [id])
    await query(`UPDATE projects SET created_by = NULL WHERE created_by = $1`, [id])

    // If linked to an employee record, clean that too
    const { rows: empRows } = await query(
      `SELECT id FROM employees WHERE user_id = $1`, [id]
    )
    if (empRows.length) {
      await query(`DELETE FROM employee_verifications WHERE employee_id = $1`, [empRows[0].id])
      await query(`DELETE FROM employees WHERE id = $1`, [empRows[0].id])
    }

    await query(`DELETE FROM users WHERE id = $1`, [id])
    await auditLog(req.user.id, 'DELETE_ADMIN', 'user', id)
    return ok(res, null, 'Admin deleted permanently')
  } catch (err) { next(err) }
}

// GET /api/admin/admins  — list active hr admins (for SuperAdmin view)
const getAdmins = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, name, username, is_active, is_first_login, created_at
       FROM users WHERE role = 'hr' ORDER BY created_at ASC`
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

// POST /api/admin/create-admin  — Super Admin only, creates ONE hr account
const createAdmin = async (req, res, next) => {
  try {
    const { name, username, password } = req.body
    if (!name || !username || !password)
      return fail(res, 'Name, username and password are required', 400)
    if (password.length < 8)
      return fail(res, 'Password must be at least 8 characters', 400)
    if (!/[A-Z]/.test(password))
      return fail(res, 'Password must contain at least one uppercase letter', 400)
    if (!/[0-9]/.test(password))
      return fail(res, 'Password must contain at least one number', 400)
    if (!/[!@#$%^&*]/.test(password))
      return fail(res, 'Password must contain at least one special character (!@#$%^&*)', 400)

    // Check username already taken
    const existing = await User.findByUsername(username)
    if (existing) return fail(res, 'Username already taken', 409)

    // Max 5 active hr admins allowed
    const { rows: hrRows } = await query(
      `SELECT id, name, username FROM users WHERE role = 'hr' AND is_active = true`
    )
    if (hrRows.length >= 5)
      return fail(res, 'Maximum 5 Admins allowed. Deactivate an existing Admin first.', 409)

    const bcrypt = require('bcryptjs')
    const hash   = await bcrypt.hash(password, 12)
    // Generate a placeholder email to avoid unique constraint on email column
    const placeholderEmail = `${username}@admin.epip.internal`
    const { rows } = await query(
      `INSERT INTO users (name, email, username, password_hash, role, is_active, is_first_login)
       VALUES ($1, $2, $3, $4, 'hr', true, true)
       RETURNING id, name, username, role`,
      [name, placeholderEmail, username, hash]
    )
    await auditLog(req.user.id, 'CREATE_ADMIN', 'user', rows[0].id)
    return created(res, rows[0], 'Admin created successfully')
  } catch (err) { next(err) }
}

// PUT /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const user = await User.update(req.params.id, req.body)
    if (!user) return fail(res, 'User not found', 404)
    await auditLog(req.user.id, 'UPDATE_USER', 'user', req.params.id)
    return ok(res, user, 'User updated')
  } catch (err) { next(err) }
}

// PATCH /api/admin/users/:id/deactivate
const deactivateUser = async (req, res, next) => {
  try {
    if (req.params.id === String(req.user.id))
      return fail(res, 'Cannot deactivate your own account', 400)
    await User.deactivate(req.params.id)
    await auditLog(req.user.id, 'DEACTIVATE_USER', 'user', req.params.id)
    return ok(res, null, 'User deactivated')
  } catch (err) { next(err) }
}

// ── Settings ───────────────────────────────────────────────────────────────

// GET /api/admin/settings
const getSettings = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM system_settings`)
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]))
    return ok(res, settings)
  } catch (err) { next(err) }
}

// PUT /api/admin/settings
const updateSettings = async (req, res, next) => {
  try {
    const entries = Object.entries(req.body)
    for (const [key, value] of entries) {
      await query(
        `INSERT INTO system_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, String(value)]
      )
    }
    await auditLog(req.user.id, 'UPDATE_SETTINGS', 'system', null, req.body)
    return ok(res, null, 'Settings updated')
  } catch (err) { next(err) }
}

// ── Holidays ───────────────────────────────────────────────────────────────

// GET /api/admin/holidays
const getHolidays = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM holidays ORDER BY date ASC`)
    return ok(res, rows)
  } catch (err) { next(err) }
}

// POST /api/admin/holidays
const createHoliday = async (req, res, next) => {
  try {
    const { name, date, type = 'national' } = req.body
    if (!name || !date) return fail(res, 'Name and date are required', 400)

    const { rows } = await query(
      `INSERT INTO holidays (name, date, type) VALUES ($1, $2, $3) RETURNING *`,
      [name, date, type]
    )
    const holiday = rows[0]

    // Notify ALL active users (employees + hr + admin)
    const { rows: allUsers } = await query(
      `SELECT id FROM users WHERE is_active = true`
    )
    const typeLabel  = type === 'national' ? 'National Holiday' : 'Company Holiday'
    const dateFormatted = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    for (const u of allUsers) {
      await Notification.create({
        user_id: u.id,
        type:    'system',
        title:   `🎉 Holiday Announced: ${name}`,
        message: `${typeLabel} — ${name} on ${dateFormatted} has been added to the company calendar.`,
        link:    '/employee/attendance',
      })
    }

    await auditLog(req.user.id, 'CREATE_HOLIDAY', 'holidays', holiday.id)
    return created(res, holiday, 'Holiday added and employees notified')
  } catch (err) { next(err) }
}

// DELETE /api/admin/holidays/:id
const deleteHoliday = async (req, res, next) => {
  try {
    await query(`DELETE FROM holidays WHERE id = $1`, [req.params.id])
    return ok(res, null, 'Holiday deleted')
  } catch (err) { next(err) }
}

// ── Shifts ─────────────────────────────────────────────────────────────────

// GET /api/admin/shifts
const getShifts = async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM shifts ORDER BY created_at ASC`)
    return ok(res, rows)
  } catch (err) { next(err) }
}

// POST /api/admin/shifts
const createShift = async (req, res, next) => {
  try {
    const { name, start_time, end_time, days } = req.body
    if (!name?.trim()) return fail(res, 'Shift name is required', 400)
    const { rows } = await query(
      `INSERT INTO shifts (name, start_time, end_time, days)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, start_time, end_time, days]
    )
    await auditLog(req.user.id, 'CREATE_SHIFT', 'shifts', rows[0].id)
    return created(res, rows[0], 'Shift created')
  } catch (err) { next(err) }
}

// PUT /api/admin/shifts/:id
const updateShift = async (req, res, next) => {
  try {
    const { name, start_time, end_time, days } = req.body
    const { rows } = await query(
      `UPDATE shifts SET name=$1, start_time=$2, end_time=$3, days=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, start_time, end_time, days, req.params.id]
    )
    if (!rows.length) return fail(res, 'Shift not found', 404)
    return ok(res, rows[0], 'Shift updated')
  } catch (err) { next(err) }
}

// DELETE /api/admin/shifts/:id
const deleteShift = async (req, res, next) => {
  try {
    const { rows } = await query(`DELETE FROM shifts WHERE id=$1 RETURNING id`, [req.params.id])
    if (!rows.length) return fail(res, 'Shift not found', 404)
    return ok(res, null, 'Shift deleted')
  } catch (err) { next(err) }
}

// ── Audit logs ─────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query
    const { rows } = await query(
      `SELECT al.*, u.name AS user_name, u.role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

module.exports = {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getUsers, updateUser, deactivateUser, createAdmin, getAdmins, deleteAdmin,
  getSettings, updateSettings,
  getHolidays, createHoliday, deleteHoliday,
  getShifts, createShift, updateShift, deleteShift,
  getAuditLogs,
}
