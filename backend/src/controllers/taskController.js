const Task         = require('../models/Task')
const Employee     = require('../models/Employee')
const Notification = require('../models/Notification')
const { query }    = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const { getFileUrl } = require('../config/storage')
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
          ? `Super Admin has assigned you a task: "${title}"${projectInfo}. Due: ${due_date || 'N/A'}. Check "My Tasks".`
          : `"${title}" has been assigned to you by ${assignerName}${projectInfo}. Due: ${due_date || 'N/A'}`,
        link: '/employee/tasks',
      })
    }
    return created(res, task, 'Task created and assigned')
  } catch (err) { next(err) }
}

// GET /api/tasks/my  — employee's own tasks (current month by default)
const getMy = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)
    const { status, priority, month, year } = req.query
    const tasks = await Task.findByEmployee(employee.id, { status, priority, month, year })
    return ok(res, tasks)
  } catch (err) { next(err) }
}

// GET /api/tasks/team  — all tasks visible to this PM (assigned by them OR from project_manager source)
const getTeamTasks = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    const { limit = 500, status, priority } = req.query

    let q = `
      SELECT t.*,
             a.first_name || ' ' || a.last_name AS assigned_to_name,
             a.avatar_url                        AS assigned_to_avatar,
             -- Unread for PM: messages sent by the assigned employee (author_id = assigned_to) not yet read
             (SELECT COUNT(*) FROM task_comments tc
              WHERE tc.task_id = t.id
                AND tc.author_id = t.assigned_to
                AND tc.is_read = false) AS unread_count
      FROM tasks t
      LEFT JOIN employees a ON t.assigned_to = a.id
      WHERE t.project_id IS NULL
        AND (t.project_name IS NULL OR t.project_name = '')
        AND (t.source = 'project_manager'`

    const params = []

    if (employee) {
      params.push(employee.id)
      q += ` OR t.assigned_by = $${params.length}`
    }

    q += `)`

    if (status)   { params.push(status);   q += ` AND t.status = $${params.length}` }
    if (priority) { params.push(priority); q += ` AND t.priority = $${params.length}` }

    params.push(parseInt(limit))
    q += ` ORDER BY t.created_at DESC LIMIT $${params.length}`

    const { rows } = await query(q, params)
    return ok(res, rows)
  } catch (err) { next(err) }
}

// GET /api/tasks/team-updates
// Returns employees grouped with all their tasks + avg completion %
// Used by PM's "Project Updates" page
const getTeamUpdates = async (req, res, next) => {
  try {
    // Fetch ALL tasks that have an assigned employee
    // PM sees all tasks (their team), admin/hr see all too
    const { rows: allTasks } = await query(
      `SELECT t.*,
              a.first_name || ' ' || a.last_name AS assigned_to_name,
              a.avatar_url                        AS assigned_to_avatar,
              b.first_name || ' ' || b.last_name AS assigned_by_name
       FROM tasks t
       LEFT JOIN employees a ON t.assigned_to = a.id
       LEFT JOIN employees b ON t.assigned_by = b.id
       WHERE t.assigned_to IS NOT NULL
         AND t.project_id IS NULL
         AND (t.project_name IS NULL OR t.project_name = '')
       ORDER BY t.created_at DESC`
    )

    // Group tasks by assigned employee
    const employeeMap = {}
    allTasks.forEach(task => {
      const empId   = task.assigned_to
      const empName = task.assigned_to_name || 'Unknown'
      const avatar  = task.assigned_to_avatar || null
      if (!empId) return

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employee_id:   empId,
          employee_name: empName,
          avatar_url:    avatar,
          tasks:         [],
        }
      }
      employeeMap[empId].tasks.push({
        id:                 task.id,
        title:              task.title,
        project_name:       task.project_name || null,
        status:             task.status,
        priority:           task.priority,
        completion_percent: task.completion_percent || 0,
        due_date:           task.due_date,
        assigned_by_name:   task.assigned_by_name,
        created_at:         task.created_at,
      })
    })

    // Compute per-employee summary stats
    const result = Object.values(employeeMap).map(emp => {
      const total   = emp.tasks.length
      const done    = emp.tasks.filter(t => t.status === 'done').length
      const avgPct  = total
        ? Math.round(emp.tasks.reduce((s, t) => s + (t.completion_percent || 0), 0) / total)
        : 0
      const overdue = emp.tasks.filter(t =>
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
      ).length
      return {
        ...emp,
        total_tasks:    total,
        done_tasks:     done,
        overdue_tasks:  overdue,
        avg_completion: avgPct,
      }
    }).sort((a, b) => b.avg_completion - a.avg_completion)

    return ok(res, result)
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
    const { status, completion_percent } = req.body
    if (!status) return fail(res, 'Status is required', 400)
    const VALID = ['todo', 'in_progress', 'review', 'to_be_tested', 'done', 'closed']
    if (!VALID.includes(status)) return fail(res, 'Invalid status', 400)
    const dbStatus = status === 'closed' ? 'done' : status === 'to_be_tested' ? 'review' : status
    const pct = (status === 'done' || status === 'closed')
      ? 100
      : completion_percent !== undefined ? parseInt(completion_percent) : undefined
    const task = await Task.updateStatus(req.params.id, dbStatus, pct)
    if (!task) return fail(res, 'Task not found', 404)
    return ok(res, { ...task, status }, 'Status updated')
  } catch (err) { next(err) }
}

// PATCH /api/tasks/:id/completion
const updateCompletion = async (req, res, next) => {
  try {
    const { completion_percent } = req.body
    const pct = Math.min(100, Math.max(0, parseInt(completion_percent) || 0))
    const task = await Task.update(req.params.id, { completion_percent: pct })
    if (!task) return fail(res, 'Task not found', 404)
    return ok(res, task, 'Completion updated')
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
    const { content } = req.body

    let file_url     = null
    let file_name    = null
    let file_type    = null
    let file_size_kb = null
    let file_data    = null

    if (req.file) {
      file_name    = req.file.originalname
      file_type    = req.file.mimetype
      file_size_kb = Math.round(req.file.size / 1024)
      // Memory storage gives req.file.buffer — encode to base64
      if (req.file.buffer) {
        file_data = `data:${file_type};base64,${req.file.buffer.toString('base64')}`
      }
    }

    if (!content && !file_data) return fail(res, 'Comment content or file is required', 400)

    const employee   = await Employee.findByUserId(req.user.id)
    const authorId   = employee?.id ?? null
    const authorName = employee
      ? `${employee.first_name} ${employee.last_name}`
      : (req.user.name || req.user.email || 'Project Manager')

    const comment = await Task.addComment(
      req.params.id, authorId, content || '', authorName,
      { file_url, file_name, file_type, file_size_kb, file_data }
    )
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

// GET /api/tasks/by-project/:projectId
const getByProject = async (req, res, next) => {
  try {
    const tasks = await Task.findByProject(req.params.projectId)
    return ok(res, tasks)
  } catch (err) { next(err) }
}

// PATCH /api/tasks/:id/comments/read
// Called when someone opens a task chat — marks all messages from the OTHER party as read
const markCommentsRead = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    const viewerEmployeeId = employee?.id ?? null
    const count = await Task.markReadByViewer(req.params.id, viewerEmployeeId)
    return ok(res, { marked: count }, 'Messages marked as read')
  } catch (err) { next(err) }
}

module.exports = {
  create, getMy, getTeamTasks, getTeamUpdates,
  getByProject, getById, update,
  updateStatus, updateCompletion,
  remove, addComment, getComments, markCommentsRead,
}
