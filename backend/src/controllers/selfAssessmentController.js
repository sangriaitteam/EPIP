const SelfAssessment = require('../models/SelfAssessment')
const Employee       = require('../models/Employee')
const Notification   = require('../models/Notification')
const { query }      = require('../config/db')
const { ok, created, fail } = require('../utils/response')

// POST /api/self-assessment  (save draft)
const save = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const sa = await SelfAssessment.upsert({ ...req.body, employee_id: employee.id })
    return ok(res, sa, 'Assessment saved')
  } catch (err) { next(err) }
}

// POST /api/self-assessment/:id/submit
const submit = async (req, res, next) => {
  try {
    const sa = await SelfAssessment.submit(req.params.id)
    if (!sa) return fail(res, 'Assessment not found', 404)

    const employee = await Employee.findById(sa.employee_id)
    const empName  = employee ? `${employee.first_name} ${employee.last_name}` : 'An employee'

    const notifPayload = {
      type:    'review',
      title:   'Self-Assessment Submitted',
      message: `${empName} has submitted their self-assessment for ${sa.period}. Please review.`,
      link:    '/hr/performance',
    }

    if (employee?.manager_id) {
      // Notify assigned manager
      const manager = await Employee.findById(employee.manager_id)
      if (manager?.user_id) {
        await Notification.create({ user_id: manager.user_id, ...notifPayload })
      }
    }

    // Always notify all HR / Admin / Superadmin users
    const { rows: hrUsers } = await query(
      `SELECT id FROM users WHERE role IN ('hr','admin','superadmin') AND is_active = true`
    )
    for (const hr of hrUsers) {
      await Notification.create({ user_id: hr.id, ...notifPayload })
    }

    return ok(res, sa, 'Assessment submitted to manager')
  } catch (err) { next(err) }
}

// GET /api/self-assessment/my
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const sa = await SelfAssessment.findByEmployee(employee.id, req.query.period)
    return ok(res, sa)
  } catch (err) { next(err) }
}

// GET /api/self-assessment/employee/:id
const getByEmployee = async (req, res, next) => {
  try {
    const sa = await SelfAssessment.findByEmployee(req.params.id, req.query.period)
    return ok(res, sa)
  } catch (err) { next(err) }
}

// GET /api/self-assessment  (HR sees all)
const getAll = async (req, res, next) => {
  try {
    const all = await SelfAssessment.findAll()
    return ok(res, all)
  } catch (err) { next(err) }
}

module.exports = { save, submit, getMy, getByEmployee, getAll }
