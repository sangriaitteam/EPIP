const { query }    = require('../config/db')
const XLSX         = require('xlsx')
const { ok, fail } = require('../utils/response')

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── helpers ────────────────────────────────────────────────────────────────
const monthRange = (year, month) => {
  const y = parseInt(year), m = parseInt(month)
  const from = `${y}-${String(m).padStart(2,'0')}-01`
  const last  = new Date(y, m, 0).getDate()
  const to    = `${y}-${String(m).padStart(2,'0')}-${String(last).padStart(2,'0')}`
  return { from, to, label: `${MONTHS[m-1]} ${y}` }
}

const sendExcel = (res, rows, sheetName, filename) => {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.send(buf)
}

// ── 1. Monthly Attendance Report ───────────────────────────────────────────
// GET /api/reports/employee/:id/attendance?year=&month=&format=json|excel
const employeeAttendance = async (req, res, next) => {
  try {
    const { id } = req.params
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, format = 'json' } = req.query
    const { from, to, label } = monthRange(year, month)

    const { rows: empRows } = await query(
      `SELECT e.first_name||' '||e.last_name AS name, e.employee_id AS emp_code,
              e.designation, d.name AS department
       FROM employees e LEFT JOIN departments d ON e.department_id=d.id
       WHERE e.id=$1`, [id]
    )
    if (!empRows.length) return fail(res, 'Employee not found', 404)
    const emp = empRows[0]

    const { rows: attRows } = await query(
      `SELECT date, check_in, check_out, hours_worked, overtime,
              status, is_late, work_mode
       FROM attendance WHERE employee_id=$1 AND date BETWEEN $2 AND $3
       ORDER BY date ASC`,
      [id, from, to]
    )

    const { rows: sumRows } = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='present')::int  AS present,
         COUNT(*) FILTER (WHERE status='absent')::int   AS absent,
         COUNT(*) FILTER (WHERE status='leave')::int    AS leave,
         COUNT(*) FILTER (WHERE is_late=true)::int      AS late,
         ROUND(SUM(COALESCE(hours_worked,0))::numeric,2) AS total_hours,
         ROUND(SUM(COALESCE(overtime,0))::numeric,2)    AS total_overtime,
         ROUND(COUNT(*) FILTER (WHERE status='present')::numeric / NULLIF(COUNT(*),0)*100,1) AS attendance_pct
       FROM attendance WHERE employee_id=$1 AND date BETWEEN $2 AND $3`,
      [id, from, to]
    )
    const summary = sumRows[0]

    if (format === 'excel') {
      const excelRows = attRows.map(r => ({
        Date:          r.date,
        'Check In':    r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—',
        'Check Out':   r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—',
        'Hours Worked': r.hours_worked || 0,
        Overtime:      r.overtime || 0,
        Status:        r.status,
        Late:          r.is_late ? 'Yes' : 'No',
        'Work Mode':   r.work_mode || '—',
      }))
      return sendExcel(res, excelRows, 'Attendance', `${emp.emp_code}_Attendance_${label.replace(' ','_')}`)
    }

    return ok(res, { employee: emp, period: label, from, to, summary, records: attRows })
  } catch (err) { next(err) }
}

// ── 2. Monthly Work Performance Report ────────────────────────────────────
// GET /api/reports/employee/:id/performance?year=&month=&format=json|excel
const employeePerformance = async (req, res, next) => {
  try {
    const { id } = req.params
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, format = 'json' } = req.query
    const { from, to, label } = monthRange(year, month)

    const { rows: empRows } = await query(
      `SELECT e.first_name||' '||e.last_name AS name, e.employee_id AS emp_code,
              e.designation, d.name AS department
       FROM employees e LEFT JOIN departments d ON e.department_id=d.id
       WHERE e.id=$1`, [id]
    )
    if (!empRows.length) return fail(res, 'Employee not found', 404)
    const emp = empRows[0]

    // Performance reviews for this employee
    const { rows: reviewRows } = await query(
      `SELECT pr.cycle, pr.type, pr.status, pr.overall_score, pr.manager_comments,
              pr.created_at, pr.updated_at
       FROM performance_reviews pr
       WHERE pr.employee_id=$1 AND pr.created_at BETWEEN $2 AND $3
       ORDER BY pr.created_at DESC`,
      [id, from+'T00:00:00', to+'T23:59:59']
    )

    // Parameters breakdown — read from performance_reviews.parameters JSONB
    // (review_parameters table does not exist; data is stored as JSONB on the review row)
    let parameters = []
    if (reviewRows.length && reviewRows[0].parameters) {
      try {
        const raw = typeof reviewRows[0].parameters === 'string'
          ? JSON.parse(reviewRows[0].parameters)
          : reviewRows[0].parameters
        // Normalise: accept array of {name,score,comments} or object map
        if (Array.isArray(raw)) {
          parameters = raw
        } else if (raw && typeof raw === 'object') {
          parameters = Object.entries(raw).map(([name, val]) => ({
            name,
            score:    typeof val === 'object' ? val.score    : val,
            comments: typeof val === 'object' ? val.comments : null,
          }))
        }
      } catch { parameters = [] }
    }

    // Self assessment for this month
    const { rows: saRows } = await query(
      `SELECT period, achievements, challenges, strengths, weaknesses,
              career_goals, status, submitted_at
       FROM self_assessments WHERE employee_id=$1 AND period LIKE $2
       LIMIT 1`,
      [id, `Q%-${year}`]
    )

    if (format === 'excel') {
      const excelRows = reviewRows.map(r => ({
        Cycle:           r.cycle,
        Type:            r.type,
        Status:          r.status,
        'Overall Score': r.overall_score || '—',
        'Manager Notes': r.manager_comments || '—',
        Date:            r.created_at?.toString().split('T')[0] || '—',
      }))
      return sendExcel(res, excelRows, 'Performance', `${emp.emp_code}_Performance_${label.replace(' ','_')}`)
    }

    return ok(res, {
      employee:    emp,
      period:      label,
      reviews:     reviewRows,
      parameters,
      self_assessment: saRows[0] || null,
    })
  } catch (err) { next(err) }
}

// ── 3. Weekly/Daily Task Completion Report ─────────────────────────────────
// GET /api/reports/employee/:id/tasks?year=&month=&format=json|excel
const employeeTasks = async (req, res, next) => {
  try {
    const { id } = req.params
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, format = 'json' } = req.query
    const { from, to, label } = monthRange(year, month)

    const { rows: empRows } = await query(
      `SELECT e.first_name||' '||e.last_name AS name, e.employee_id AS emp_code,
              e.designation, d.name AS department
       FROM employees e LEFT JOIN departments d ON e.department_id=d.id
       WHERE e.id=$1`, [id]
    )
    if (!empRows.length) return fail(res, 'Employee not found', 404)
    const emp = empRows[0]

    const { rows: taskRows } = await query(
      `SELECT t.title, t.description, t.status, t.priority,
              t.completion_percent, t.due_date, t.created_at,
              t.updated_at
       FROM tasks t
       WHERE t.assigned_to=$1 AND t.created_at BETWEEN $2 AND $3
       ORDER BY t.due_date ASC`,
      [id, from+'T00:00:00', to+'T23:59:59']
    )

    const summary = {
      total:        taskRows.length,
      done:         taskRows.filter(r => r.status === 'done').length,
      in_progress:  taskRows.filter(r => r.status === 'in_progress').length,
      todo:         taskRows.filter(r => r.status === 'todo').length,
      avg_completion: taskRows.length
        ? Math.round(taskRows.reduce((s,r) => s+(r.completion_percent||0),0) / taskRows.length)
        : 0,
    }

    if (format === 'excel') {
      const excelRows = taskRows.map(r => ({
        Title:       r.title,
        Status:      r.status,
        Priority:    r.priority,
        'Completion %': r.completion_percent || 0,
        'Due Date':  r.due_date || '—',
        Created:     r.created_at?.toString().split('T')[0] || '—',
      }))
      return sendExcel(res, excelRows, 'Tasks', `${emp.emp_code}_Tasks_${label.replace(' ','_')}`)
    }

    return ok(res, { employee: emp, period: label, summary, records: taskRows })
  } catch (err) { next(err) }
}

// ── 4. Monthly KPI Report ──────────────────────────────────────────────────
// GET /api/reports/employee/:id/kpi?year=&month=&format=json|excel
const employeeKPI = async (req, res, next) => {
  try {
    const { id } = req.params
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, format = 'json' } = req.query
    const { from, to, label } = monthRange(year, month)

    const { rows: empRows } = await query(
      `SELECT e.first_name||' '||e.last_name AS name, e.employee_id AS emp_code,
              e.designation, d.name AS department
       FROM employees e LEFT JOIN departments d ON e.department_id=d.id
       WHERE e.id=$1`, [id]
    )
    if (!empRows.length) return fail(res, 'Employee not found', 404)
    const emp = empRows[0]

    // Goals/KPIs for this period
    const { rows: goalRows } = await query(
      `SELECT g.title, g.description, g.type, g.kpi_metric,
              g.completion_percent, g.weightage,
              g.status, g.approval_status,
              g.due_date, g.period
       FROM goals g
       WHERE g.employee_id=$1 AND g.created_at BETWEEN $2 AND $3
       ORDER BY g.weightage DESC`,
      [id, from+'T00:00:00', to+'T23:59:59']
    )

    // Weighted KPI score
    const totalWeight  = goalRows.reduce((s,g) => s+(g.weightage||0), 0)
    const weightedScore = totalWeight > 0
      ? Math.round(goalRows.reduce((s,g) => s+(g.completion_percent||0)*(g.weightage||0),0) / totalWeight)
      : 0

    // Attendance for KPI
    const { rows: attSum } = await query(
      `SELECT ROUND(COUNT(*) FILTER (WHERE status='present')::numeric/NULLIF(COUNT(*),0)*100,1) AS pct
       FROM attendance WHERE employee_id=$1 AND date BETWEEN $2 AND $3`,
      [id, from, to]
    )

    const kpiSummary = {
      total_goals:      goalRows.length,
      achieved:         goalRows.filter(g => g.completion_percent >= 100).length,
      in_progress:      goalRows.filter(g => g.completion_percent > 0 && g.completion_percent < 100).length,
      not_started:      goalRows.filter(g => !g.completion_percent).length,
      weighted_score:   weightedScore,
      attendance_pct:   attSum[0]?.pct || 0,
    }

    if (format === 'excel') {
      const excelRows = goalRows.map(g => ({
        'Goal/KPI':      g.title,
        Type:            g.type,
        'KPI Metric':    g.kpi_metric || '—',
        'Completion %':  g.completion_percent || 0,
        Weightage:       g.weightage || 0,
        Status:          g.status,
        Period:          g.period || label,
      }))
      return sendExcel(res, excelRows, 'KPI', `${emp.emp_code}_KPI_${label.replace(' ','_')}`)
    }

    return ok(res, { employee: emp, period: label, kpi_summary: kpiSummary, records: goalRows })
  } catch (err) { next(err) }
}

// ── Legacy APIs (kept for compatibility) ──────────────────────────────────
const attendanceReport = async (req, res, next) => {
  try {
    const { from, to, department_id } = req.query
    if (!from || !to) return fail(res, 'from and to dates are required', 400)
    let q = `SELECT a.date, a.status, a.check_in, a.check_out,
                    a.hours_worked, a.overtime, a.is_late, a.work_mode,
                    e.first_name || ' ' || e.last_name AS employee_name,
                    e.employee_id, d.name AS department_name
             FROM attendance a
             JOIN employees e ON a.employee_id = e.id
             LEFT JOIN departments d ON e.department_id = d.id
             WHERE a.date BETWEEN $1 AND $2`
    const params = [from, to]
    if (department_id) { params.push(department_id); q += ` AND e.department_id = $${params.length}` }
    q += ` ORDER BY a.date DESC, e.last_name`
    const { rows } = await query(q, params)
    return ok(res, { from, to, total: rows.length, records: rows })
  } catch (err) { next(err) }
}

const companySummary = async (req, res, next) => {
  try {
    const now  = new Date()
    const from = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
    const to   = now.toISOString().split('T')[0]
    const [empStats, deptStats, reviewStats, taskStats] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='active')::int AS active FROM employees`),
      query(`SELECT COUNT(*)::int AS total FROM departments`),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='completed')::int AS completed, ROUND(AVG(overall_score)::numeric,1) AS avg_score FROM performance_reviews`),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='done')::int AS done FROM tasks`),
    ])
    return ok(res, { employees: empStats.rows[0], departments: deptStats.rows[0], reviews: reviewStats.rows[0], tasks: taskStats.rows[0], period: { from, to } })
  } catch (err) { next(err) }
}

module.exports = {
  employeeAttendance, employeePerformance, employeeTasks, employeeKPI,
  attendanceReport, companySummary,
}
