const Employee   = require('../models/Employee')
const Attendance = require('../models/Attendance')
const Task       = require('../models/Task')
const { query }  = require('../config/db')
const { ok, fail } = require('../utils/response')

// GET /api/dashboard/employee
const employeeDashboard = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const now   = new Date()
    const today = now.toISOString().split('T')[0]
    const year  = now.getFullYear()
    const month = now.getMonth() + 1

    const [todayAttendance, monthlySummary, tasks] = await Promise.all([
      Attendance.findByDate(employee.id, today),
      Attendance.monthlySummary(employee.id, year, month),
      Task.findByEmployee(employee.id),
    ])

    const activeTasks    = tasks.filter(t => t.status !== 'done').length
    const completedTasks = tasks.filter(t => t.status === 'done').length

    return ok(res, {
      employee,
      today_attendance: todayAttendance || { status: 'not_checked_in' },
      monthly_summary:  monthlySummary,
      task_stats: {
        total: tasks.length, active: activeTasks, completed: completedTasks,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
      },
      recent_tasks: tasks.slice(0, 5),
    })
  } catch (err) { next(err) }
}

// GET /api/dashboard/manager
const managerDashboard = async (req, res, next) => {
  try {
    const manager = await Employee.findByUserId(req.user.id)
    if (!manager) return fail(res, 'Manager profile not found', 404)

    const team  = await Employee.findByManager(manager.id)
    const now   = new Date()
    const year  = now.getFullYear()
    const month = now.getMonth() + 1

    // Team tasks
    const teamTasks = await Task.findByManager(manager.id)

    // Attendance summary for team this month
    const attendanceSummaries = await Promise.all(
      team.slice(0, 5).map(async e => {
        const s = await Attendance.monthlySummary(e.id, year, month)
        return { employee: `${e.first_name} ${e.last_name}`, ...s }
      })
    )

    return ok(res, {
      manager,
      team_size:          team.length,
      team,
      open_tasks:         teamTasks.filter(t => t.status !== 'done').length,
      recent_tasks:       teamTasks.slice(0, 5),
      attendance_summary: attendanceSummaries,
    })
  } catch (err) { next(err) }
}

// GET /api/dashboard/hr
const hrDashboard = async (req, res, next) => {
  try {
    const now   = new Date()
    const year  = now.getFullYear()
    const month = now.getMonth() + 1
    const from  = `${year}-${String(month).padStart(2, '0')}-01`
    const to    = now.toISOString().split('T')[0]

    const [
      { rows: empCount },
      { rows: deptCount },
      companyAttendance,
    ] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='active')::int AS active FROM employees`),
      query(`SELECT COUNT(*)::int AS total FROM departments`),
      Attendance.companyStats(from, to),
    ])

    return ok(res, {
      total_employees:   empCount[0].total,
      active_employees:  empCount[0].active,
      total_departments: deptCount[0].total,
      attendance_rate:   companyAttendance?.attendance_rate || 0,
    })
  } catch (err) { next(err) }
}

module.exports = { employeeDashboard, managerDashboard, hrDashboard }
