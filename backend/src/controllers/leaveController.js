const Employee     = require('../models/Employee')
const Notification = require('../models/Notification')
const { ok, created, fail } = require('../utils/response')
const { query }    = require('../config/db')
const auditLog     = require('../utils/auditLog')

// ── helpers ───────────────────────────────────────────────────────────────────
const calcDays = (start, end) => {
  const s = new Date(start), e = new Date(end)
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
}

// POST /api/leaves  — Employee submits a leave request
const requestLeave = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const { leave_type = 'casual', start_date, end_date, reason } = req.body
    if (!start_date || !end_date) return fail(res, 'Start and end date are required', 400)
    if (new Date(end_date) < new Date(start_date))
      return fail(res, 'End date cannot be before start date', 400)

    const days = calcDays(start_date, end_date)

    const { rows } = await query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employee.id, leave_type, start_date, end_date, days, reason || null]
    )
    const leave = rows[0]

    // Notify all HR users
    const { rows: hrUsers } = await query(
      `SELECT id FROM users WHERE role IN ('hr','admin','superadmin') AND is_active=true`
    )
    for (const hr of hrUsers) {
      await Notification.create({
        user_id: hr.id,
        type:    'approval',
        title:   'New Leave Request',
        message: `${employee.first_name} ${employee.last_name} has requested ${days} day(s) of ${leave_type} leave (${start_date} to ${end_date}).`,
        link:    '/hr/leaves',
      })
    }

    await auditLog(req.user.id, 'REQUEST_LEAVE', 'leave_requests', leave.id)
    return created(res, leave, 'Leave request submitted successfully')
  } catch (err) { next(err) }
}

// GET /api/leaves/my  — Employee sees their own leave history
const getMyLeaves = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const { rows } = await query(
      `SELECT lr.*, u.name AS reviewed_by_name
       FROM leave_requests lr
       LEFT JOIN users u ON lr.reviewed_by = u.id
       WHERE lr.employee_id = $1
       ORDER BY lr.created_at DESC`,
      [employee.id]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

// GET /api/leaves  — HR sees all pending leave requests
const getAllLeaves = async (req, res, next) => {
  try {
    const { status = 'pending' } = req.query
    const { rows } = await query(
      `SELECT lr.*,
              e.first_name, e.last_name, e.designation,
              d.name AS department_name,
              u.name AS reviewed_by_name
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN users u ON lr.reviewed_by = u.id
       WHERE ($1 = 'all' OR lr.status = $1)
       ORDER BY lr.created_at DESC`,
      [status]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

// PATCH /api/leaves/:id  — HR approves or rejects
const reviewLeave = async (req, res, next) => {
  try {
    const { status, reviewer_note } = req.body
    if (!['approved', 'rejected'].includes(status))
      return fail(res, 'Status must be approved or rejected', 400)

    const { rows } = await query(
      `UPDATE leave_requests
       SET status=$1, reviewed_by=$2, reviewed_at=NOW(), reviewer_note=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status, req.user.id, reviewer_note || null, req.params.id]
    )
    if (!rows.length) return fail(res, 'Leave request not found', 404)
    const leave = rows[0]

    // Notify the employee
    const { rows: empRows } = await query(
      `SELECT e.user_id, e.first_name FROM employees e WHERE e.id=$1`,
      [leave.employee_id]
    )
    if (empRows.length) {
      await Notification.create({
        user_id: empRows[0].user_id,
        type:    'approval',
        title:   `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your ${leave.leave_type} leave request (${leave.start_date instanceof Date ? leave.start_date.toISOString().split('T')[0] : String(leave.start_date).split('T')[0]} to ${leave.end_date instanceof Date ? leave.end_date.toISOString().split('T')[0] : String(leave.end_date).split('T')[0]}) has been ${status}.${reviewer_note ? ' Note: ' + reviewer_note : ''}`,
        link:    '/employee/attendance',
      })
    }

    await auditLog(req.user.id, `LEAVE_${status.toUpperCase()}`, 'leave_requests', leave.id)
    return ok(res, leave, `Leave request ${status}`)
  } catch (err) { next(err) }
}

// DELETE /api/leaves/:id  — Employee cancels a pending request
const cancelLeave = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const { rows } = await query(
      `DELETE FROM leave_requests WHERE id=$1 AND employee_id=$2 AND status='pending' RETURNING id`,
      [req.params.id, employee.id]
    )
    if (!rows.length) return fail(res, 'Leave request not found or already reviewed', 404)
    return ok(res, null, 'Leave request cancelled')
  } catch (err) { next(err) }
}

module.exports = { requestLeave, getMyLeaves, getAllLeaves, reviewLeave, cancelLeave }
