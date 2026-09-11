const Task     = require('../models/Task')
const Employee = require('../models/Employee')
const Notification = require('../models/Notification')
const { ok, created, fail } = require('../utils/response')
const emailService = require('../services/emailService')

// POST /api/tasks
const create = async (req, res, next) => {
  try {
    const assigner = await Employee.findByUserId(req.user.id)
    const assignerName = assigner
      ? `${assigner.first_name} ${assigner.last_name}`
      : req.user.name || 'HR/Admin'
    const assignerId = assigner?.id || null

    const { title, description, assigned_to, priority, due_date, tags,
            project_id, project_name, source } = req.body

    const task = await Task.create({
      title, description, assigned_to, priority, due_date, tags,
      assigned_by:  assignerId,
      project_id:   project_id   || null,
      project_name: project_name || null,
      source:       source       || (req.user.role === 'superadmin' ? 'superadmin' : 'hr'),
    })

    // Notify assignee
    const assignee = await Employee.findById(assigned_to)
    if (assignee?.user_id) {
      const isFromSuperAdmin = source === 'superadmin' || req.user.role === 'superadmin'
      const projectInfo = project_name ? ` (Project: ${project_name})` : ''
      await Notification.create({
        user_id: assignee.user_id,
        type:    'task',
        title:   isFromSuperAdmin ? '⭐ Task from Super Admin' : '📋 New Task Assigned',
        message: isFromSuperAdmin
          ? `Super Admin has assigned you a task: "${title}"${projectInfo}. Due: ${due_date || 'N/A'}. Check "My Tasks → From Superadmin".`
          : `"${title}" has been assigned to you by ${assignerName}${projectInfo}. Due: ${due_date || 'N/A'}`,
        link: '/employee/tasks',
      })
    }
    return created(res, task, 'Task created and assigned')
  } catch (err) { next(err) }
}

// GET /api/tasks/my
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const { status, priority } = req.query
    const tasks = await Task.findByEmployee(employee.id, { status, priority })
    return ok(res, tasks)
  } catch (err) { next(err) }
}

// GET /api/tasks/team
const getTeamTasks = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const tasks = await Task.findByManager(employee.id, req.query)
    return ok(res, tasks)
  } catch (err) { next(err) }
}

// GET /api/tasks/:id
const getById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) return fail(res, 'Task not found', 404)
    return ok(res, task)
  } catch (err) { next(err) }
}

// PUT /api/tasks/:id
const update = async (req, res, next) => {
  try {
    const task = await Task.update(req.params.id, req.body)
    if (!task) return fail(res, 'Task not found', 404)
    return ok(res, task, 'Task updated')
  } catch (err) { next(err) }
}

// PATCH /api/tasks/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    if (!status) return fail(res, 'Status is required', 400)
    const task = await Task.updateStatus(req.params.id, status)
    if (!task) return fail(res, 'Task not found', 404)
    return ok(res, task, 'Status updated')
  } catch (err) { next(err) }
}

// DELETE /api/tasks/:id
const remove = async (req, res, next) => {
  try {
    await Task.delete(req.params.id)
    return ok(res, null, 'Task deleted')
  } catch (err) { next(err) }
}

// POST /api/tasks/:id/comments
const addComment = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee not found', 404)
    const { content } = req.body
    if (!content) return fail(res, 'Comment content is required', 400)
    const comment = await Task.addComment(req.params.id, employee.id, content)
    return created(res, comment, 'Comment added')
  } catch (err) { next(err) }
}

// GET /api/tasks/:id/comments
const getComments = async (req, res, next) => {
  try {
    const comments = await Task.getComments(req.params.id)
    return ok(res, comments)
  } catch (err) { next(err) }
}

module.exports = { create, getMy, getTeamTasks, getById, update, updateStatus, remove, addComment, getComments }
