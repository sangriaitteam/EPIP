const Employee     = require('../models/Employee')
const Attendance   = require('../models/Attendance')
const Task         = require('../models/Task')
const Goal         = require('../models/Goal')
const PerformanceReview = require('../models/PerformanceReview')
const { query }    = require('../config/db')
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

    const [todayAttendance, monthlySummary, tasks, goals, reviews] = await Promise.all([
      Attendance.findByDate(employee.id, today),
      Attendance.monthlySummary(employee.id, year, month),
      Task.findByEmployee(employee.id),
      Goal.findByEmployee(employee.id),
      PerformanceReview.findByEmployee(employee.id),
    ])

    const activeTasks     = tasks.filter(t => t.status !== 'done').length
    const completedTasks  = tasks.filter(t => t.status === 'done').length
    const avgGoalProgress = goals.length
      ? Math.round(goals.reduce((s, g) => s + (g.completion_percent || 0), 0) / goals.length)
      : 0
    const latestReview    = reviews[0] || null

    return ok(res, {
      employee,
      today_attendance: todayAttendance || { status: 'not_checked_in' },
      monthly_summary:  monthlySummary,
      task_stats: {
        total: tasks.length, active: activeTasks, completed: completedTasks,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
      },
      goal_stats: {
        total: goals.length, avg_progress: avgGoalProgress,
        approved: goals.filter(g => g.approval_status === 'approved').length,
      },
      latest_review: latestReview,
      recent_tasks: tasks.slice(0, 5),
      recent_goals: goals.slice(0, 4),
    })
  } catch (err) { next(err) }
}

// GET /api/dashboard/manager
const managerDashboard = async (req, res, next) => {
  try {
    const manager = await Employee.findByUserId(req.user.id)
    if (!manager) return fail(res, 'Manager profile not found', 404)

    const team     = await Employee.findByManager(manager.id)
    const teamIds  = team.map(e => e.id)
    const now      = new Date()
    const year     = now.getFullYear()
    const month    = now.getMonth() + 1

    // Pending reviews for team
    const pendingReviews = await PerformanceReview.findAll({ status: 'pending' })
    const teamPending    = pendingReviews.filter(r => teamIds.includes(r.employee_id))

    // Team tasks
    const teamTasks = await Task.findByManager(manager.id)

    // Attendance summary for team this month
    const attendanceSummaries = await Promise.all(
      team.slice(0, 5).map(async e => {
        const s = await Attendance.monthlySummary(e.id, year, month)
        return { employee: `${e.first_name} ${e.last_name}`, ...s }
      })
    )

    // Avg performance score across team
    const teamReviews = await Promise.all(
      team.map(e => PerformanceReview.findByEmployee(e.id))
    )
    const scores = teamReviews.flat().map(r => r.overall_score).filter(Boolean)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

    return ok(res, {
      manager,
      team_size:       team.length,
      team:            team,
      pending_reviews: teamPending.length,
      avg_score:       avgScore,
      open_tasks:      teamTasks.filter(t => t.status !== 'done').length,
      recent_tasks:    teamTasks.slice(0, 5),
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
      allReviews,
      companyAttendance,
    ] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='active')::int AS active FROM employees`),
      query(`SELECT COUNT(*)::int AS total FROM departments`),
      PerformanceReview.findAll(),
      Attendance.companyStats(from, to),
    ])

    const completed  = allReviews.filter(r => r.status === 'completed')
    const avgScore   = completed.length
      ? Math.round(completed.reduce((s, r) => s + (r.overall_score || 0), 0) / completed.length)
      : 0

    return ok(res, {
      total_employees:    empCount[0].total,
      active_employees:   empCount[0].active,
      total_departments:  deptCount[0].total,
      attendance_rate:    companyAttendance?.attendance_rate || 0,
      pending_reviews:    allReviews.filter(r => r.status === 'pending').length,
      avg_performance:    avgScore,
      total_reviews:      allReviews.length,
    })
  } catch (err) { next(err) }
}

module.exports = { employeeDashboard, managerDashboard, hrDashboard }
