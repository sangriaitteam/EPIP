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

// ── 5. All Employees Monthly Attendance Grid ───────────────────────────────
// GET /api/reports/all-employees/attendance?year=&month=&format=json|excel
const allEmployeesAttendance = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, format = 'json' } = req.query
    const { from, to, label } = monthRange(year, month)

    // All days in the month
    const y = parseInt(year), m = parseInt(month)
    const daysInMonth = new Date(y, m, 0).getDate()
    const allDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${d}`
      const dayOfWeek = new Date(dateStr).getDay() // 0=Sun, 6=Sat
      return { day: i + 1, date: dateStr, isSunday: dayOfWeek === 0, isSaturday: dayOfWeek === 6 }
    })

    // Fetch all employees
    const { rows: employees } = await query(
      `SELECT e.id, e.first_name || ' ' || e.last_name AS name,
              COALESCE(ev.company_provided_id, e.employee_id) AS emp_code,
              e.designation, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN employee_verifications ev ON ev.employee_id = e.id
       WHERE e.status = 'active'
       ORDER BY
         CASE
           WHEN ev.company_provided_id IS NOT NULL AND ev.company_provided_id ~ '[0-9]+$'
             THEN LPAD(regexp_replace(ev.company_provided_id, '^.*?([0-9]+)$', '\\1'), 20, '0')
           ELSE LPAD(regexp_replace(e.employee_id, '^.*?([0-9]+)$', '\\1'), 20, '0')
         END ASC,
         e.id ASC`
    )

    // Fetch all attendance records for this month in one query
    const { rows: attRows } = await query(
      `SELECT employee_id, date::text, status, check_in, check_out,
              hours_worked, overtime, is_late, work_mode
       FROM attendance
       WHERE date BETWEEN $1 AND $2
       ORDER BY employee_id, date ASC`,
      [from, to]
    )

    // Build lookup: empId → { dateStr → record }
    const attMap = {}
    for (const r of attRows) {
      if (!attMap[r.employee_id]) attMap[r.employee_id] = {}
      attMap[r.employee_id][r.date] = r
    }

    // Build result per employee
    const result = employees.map(emp => {
      const days = allDays.map(d => {
        const rec = attMap[emp.id]?.[d.date] || null
        let cellStatus = 'nodata'
        if (d.isSunday) {
          // Sunday — check if they worked (overtime)
          cellStatus = rec && rec.status === 'present' ? 'sunday_ot' : 'sunday'
        } else {
          if (rec) {
            cellStatus = rec.status // 'present', 'absent', 'leave', 'holiday'
          } else {
            // Future dates → nodata, past dates → absent
            const today = new Date().toISOString().split('T')[0]
            cellStatus = d.date > today ? 'future' : 'absent'
          }
        }
        return {
          day:          d.day,
          date:         d.date,
          isSunday:     d.isSunday,
          isSaturday:   d.isSaturday,
          status:       cellStatus,
          check_in:     rec?.check_in  || null,
          check_out:    rec?.check_out || null,
          hours_worked: rec?.hours_worked || null,
          overtime:     rec?.overtime || null,
          is_late:      rec?.is_late || false,
        }
      })

      const workDays = allDays.filter(d => !d.isSunday)
      const present  = days.filter(d => d.status === 'present').length
      const absent   = days.filter(d => d.status === 'absent').length
      const leave    = days.filter(d => d.status === 'leave').length
      const sundayOT = days.filter(d => d.status === 'sunday_ot').length

      return {
        id:          emp.id,
        name:        emp.name,
        emp_code:    emp.emp_code,
        designation: emp.designation,
        department:  emp.department_name,
        days,
        summary: { present, absent, leave, sunday_ot: sundayOT, work_days: workDays.length },
      }
    })

    if (format === 'excel') {
      const XLSXStyle = require('xlsx-js-style')

      // ── Color map ─────────────────────────────────────────────────────
      const FILLS = {
        present:   { fgColor: { rgb: '22C55E' } }, // green
        absent:    { fgColor: { rgb: 'EF4444' } }, // red
        sunday_ot: { fgColor: { rgb: 'A855F7' } }, // purple
        leave:     { fgColor: { rgb: 'FACC15' } }, // yellow
        holiday:   { fgColor: { rgb: '60A5FA' } }, // blue
        sunday:    { fgColor: { rgb: '6B7280' } }, // gray
        future:    { fgColor: { rgb: '334155' } }, // dark slate navy
        nodata:    { fgColor: { rgb: '334155' } }, // dark slate navy
      }

      // All cells → white text, bold
      const fontWhite = { color: { rgb: 'FFFFFF' }, bold: true, sz: 9 }
      const fontDark  = { color: { rgb: 'FFFFFF' }, bold: false, sz: 9 } // also white now

      const cellLabel = (status, isSunday) => {
        if (isSunday && status === 'sunday_ot') return 'OT'
        if (isSunday)                            return 'S'
        if (status === 'present')  return 'P'
        if (status === 'absent')   return 'A'
        if (status === 'leave')    return 'L'
        if (status === 'holiday')  return 'H'
        return ''
      }

      // ── Build worksheet using aoa (array of arrays) ───────────────────
      const aoa = []

      // Row 0 — Header
      const headerRow = [
        { v: 'Name',         s: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '6366F1' } }, alignment: { horizontal: 'left' } } },
        { v: 'ID',           s: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '6366F1' } }, alignment: { horizontal: 'left' } } },
      ]
      for (const d of allDays) {
        const dow = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d.date).getDay()]
        const isSun = d.isSunday
        headerRow.push({
          v: `${d.day}\n${dow}`,
          s: {
            font:      { bold: true, color: { rgb: isSun ? 'F3E8FF' : 'FFFFFF' }, sz: 8 },
            fill:      { fgColor: { rgb: isSun ? '7C3AED' : '6366F1' } },
            alignment: { horizontal: 'center', wrapText: true },
          },
        })
      }
      headerRow.push(
        { v: 'P',   s: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '16A34A' } }, alignment: { horizontal: 'center' } } },
        { v: 'A',   s: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: 'DC2626' } }, alignment: { horizontal: 'center' } } },
        { v: 'OT',  s: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, fill: { fgColor: { rgb: '7C3AED' } }, alignment: { horizontal: 'center' } } },
      )
      aoa.push(headerRow)

      // Data rows
      for (let ri = 0; ri < result.length; ri++) {
        const emp    = result[ri]
        const isEven = ri % 2 === 0
        const rowBg  = isEven ? 'FFFFFF' : 'F9FAFB'

        const row = [
          { v: emp.name,          s: { font: { bold: true,  sz: 10 }, fill: { fgColor: { rgb: rowBg } }, alignment: { horizontal: 'left' } } },
          { v: emp.emp_code || '',s: { font: { bold: false, sz: 9,  color: { rgb: '6B7280' } }, fill: { fgColor: { rgb: rowBg } }, alignment: { horizontal: 'left' } } },
        ]

        for (const d of emp.days) {
          const lbl  = cellLabel(d.status, d.isSunday)
          const fill = FILLS[d.status] || FILLS.nodata
          const font = fontWhite
          row.push({
            v: lbl,
            s: {
              font,
              fill,
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
                bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
                left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
                right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
              },
            },
          })
        }

        // Summary P / A / OT
        row.push(
          { v: emp.summary.present,    s: { font: { bold: true, color: { rgb: '16A34A' }, sz: 10 }, fill: { fgColor: { rgb: rowBg } }, alignment: { horizontal: 'center' } } },
          { v: emp.summary.absent,     s: { font: { bold: true, color: { rgb: 'DC2626' }, sz: 10 }, fill: { fgColor: { rgb: rowBg } }, alignment: { horizontal: 'center' } } },
          { v: emp.summary.sunday_ot,  s: { font: { bold: true, color: { rgb: '7C3AED' }, sz: 10 }, fill: { fgColor: { rgb: rowBg } }, alignment: { horizontal: 'center' } } },
        )
        aoa.push(row)
      }

      const ws = XLSXStyle.utils.aoa_to_sheet(aoa)

      // Row height for header
      ws['!rows'] = [{ hpt: 28 }, ...result.map(() => ({ hpt: 20 }))]

      // Column widths: Name(24), ID(14), days(4 each), P/A/OT(5 each)
      ws['!cols'] = [
        { wch: 24 },
        { wch: 14 },
        ...allDays.map(() => ({ wch: 4 })),
        { wch: 5 }, { wch: 5 }, { wch: 5 },
      ]

      const wb = XLSXStyle.utils.book_new()
      XLSXStyle.utils.book_append_sheet(wb, ws, label)

      const buf      = XLSXStyle.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const filename = `AllEmployees_Attendance_${label.replace(' ', '_')}.xlsx`
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      return res.send(buf)
    }

    return ok(res, {
      period:          label,
      year:            y,
      month:           m,
      days_in_month:   daysInMonth,
      all_days:        allDays,
      employees:       result,
      total_employees: result.length,
    })
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
  allEmployeesAttendance,
  attendanceReport, companySummary,
}
