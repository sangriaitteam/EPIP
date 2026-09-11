const Goal         = require('../models/Goal')
const Employee     = require('../models/Employee')
const Notification = require('../models/Notification')
const { ok, created, fail } = require('../utils/response')
const { getFileUrl } = require('../config/storage')

// POST /api/goals
const create = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const goal = await Goal.create({ ...req.body, employee_id: employee.id })
    // Notify manager for approval
    if (employee.manager_id) {
      const manager = await Employee.findById(employee.manager_id)
      if (manager?.user_id) {
        await Notification.create({
          user_id: manager.user_id,
          type: 'approval',
          title: 'Goal Awaiting Approval',
          message: `${employee.first_name} submitted a goal: "${goal.title}"`,
        })
      }
    }
    return created(res, goal, 'Goal created')
  } catch (err) { next(err) }
}

// GET /api/goals/my
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const goals = await Goal.findByEmployee(employee.id, req.query)
    return ok(res, goals)
  } catch (err) { next(err) }
}

// GET /api/goals/employee/:id
const getByEmployee = async (req, res, next) => {
  try {
    const goals = await Goal.findByEmployee(req.params.id, req.query)
    return ok(res, goals)
  } catch (err) { next(err) }
}

// GET /api/goals/department/:id
const getByDepartment = async (req, res, next) => {
  try {
    const goals = await Goal.findByDepartment(req.params.id)
    return ok(res, goals)
  } catch (err) { next(err) }
}

// GET /api/goals/:id
const getById = async (req, res, next) => {
  try {
    const goal = await Goal.findById(req.params.id)
    if (!goal) return fail(res, 'Goal not found', 404)
    return ok(res, goal)
  } catch (err) { next(err) }
}

// PUT /api/goals/:id
const update = async (req, res, next) => {
  try {
    const goal = await Goal.update(req.params.id, req.body)
    if (!goal) return fail(res, 'Goal not found', 404)
    return ok(res, goal, 'Goal updated')
  } catch (err) { next(err) }
}

// PATCH /api/goals/:id/approve
const approve = async (req, res, next) => {
  try {
    const reviewer = await Employee.findByUserId(req.user.id)
    const goal = await Goal.approve(req.params.id, reviewer?.id)
    if (!goal) return fail(res, 'Goal not found', 404)
    // Notify employee
    const employee = await Employee.findById(goal.employee_id)
    if (employee?.user_id) {
      await Notification.create({
        user_id: employee.user_id,
        type: 'approval',
        title: 'Goal Approved',
        message: `Your goal "${goal.title}" has been approved.`,
      })
    }
    return ok(res, goal, 'Goal approved')
  } catch (err) { next(err) }
}

// POST /api/goals/:id/evidence
const uploadEvidence = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'No file uploaded', 400)
    const url = getFileUrl('evidence', req.file.filename)
    await Goal.uploadEvidence(req.params.id, url, req.file.originalname)
    return ok(res, { url }, 'Evidence uploaded')
  } catch (err) { next(err) }
}

// DELETE /api/goals/:id
const remove = async (req, res, next) => {
  try {
    await Goal.delete(req.params.id)
    return ok(res, null, 'Goal deleted')
  } catch (err) { next(err) }
}

module.exports = { create, getMy, getByEmployee, getByDepartment, getById, update, approve, uploadEvidence, remove }
