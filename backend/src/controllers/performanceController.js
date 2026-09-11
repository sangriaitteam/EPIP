const PerformanceReview = require('../models/PerformanceReview')
const Employee          = require('../models/Employee')
const Notification      = require('../models/Notification')
const { ok, created, fail } = require('../utils/response')
const emailService      = require('../services/emailService')

// POST /api/performance
const create = async (req, res, next) => {
  try {
    const reviewer = await Employee.findByUserId(req.user.id)
    const { employee_id, cycle, type } = req.body
    const review = await PerformanceReview.create({
      employee_id, cycle, type,
      reviewer_id: reviewer?.id,
    })
    return created(res, review, 'Review cycle created')
  } catch (err) { next(err) }
}

// GET /api/performance
const getAll = async (req, res, next) => {
  try {
    const reviews = await PerformanceReview.findAll(req.query)
    return ok(res, reviews)
  } catch (err) { next(err) }
}

// GET /api/performance/my
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const reviews = await PerformanceReview.findByEmployee(employee.id)
    return ok(res, reviews)
  } catch (err) { next(err) }
}

// GET /api/performance/employee/:id
const getByEmployee = async (req, res, next) => {
  try {
    const reviews = await PerformanceReview.findByEmployee(req.params.id)
    return ok(res, reviews)
  } catch (err) { next(err) }
}

// GET /api/performance/:id
const getById = async (req, res, next) => {
  try {
    const review = await PerformanceReview.findById(req.params.id)
    if (!review) return fail(res, 'Review not found', 404)
    return ok(res, review)
  } catch (err) { next(err) }
}

// PUT /api/performance/:id/submit
const submitReview = async (req, res, next) => {
  try {
    const reviewer = await Employee.findByUserId(req.user.id)
    const { parameters, manager_comments } = req.body
    if (!parameters?.length) return fail(res, 'Parameters are required', 400)

    const review = await PerformanceReview.submitRatings(req.params.id, {
      parameters,
      manager_comments,
      reviewer_id: reviewer?.id,
    })
    if (!review) return fail(res, 'Review not found', 404)

    // Notify employee
    const employee = await Employee.findById(review.employee_id)
    if (employee?.user_id) {
      await Notification.create({
        user_id: employee.user_id,
        type: 'review',
        title: 'Performance Review Completed',
        message: `Your ${review.type} review for ${review.cycle} has been submitted. Score: ${review.overall_score}/100`,
      })
      emailService.sendReviewComplete(employee.email, review).catch(() => {})
    }
    return ok(res, review, 'Review submitted successfully')
  } catch (err) { next(err) }
}

// PATCH /api/performance/:id/hr-approve
const hrApprove = async (req, res, next) => {
  try {
    const { hr_comments } = req.body
    const review = await PerformanceReview.hrApprove(req.params.id, hr_comments)
    if (!review) return fail(res, 'Review not found', 404)
    return ok(res, review, 'Review approved by HR')
  } catch (err) { next(err) }
}

// GET /api/performance/params/default
const getDefaultParams = async (req, res, next) => {
  try {
    const params = await PerformanceReview.getDefaultParams()
    return ok(res, params)
  } catch (err) { next(err) }
}

module.exports = { create, getAll, getMy, getByEmployee, getById, submitReview, hrApprove, getDefaultParams }
