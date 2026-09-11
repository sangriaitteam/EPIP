/**
 * reportService.js
 * Builds structured report data for PDF/Excel export.
 * PDF generation uses jspdf (client-side) — this service prepares raw data.
 */
const { query } = require('../config/db')

/**
 * Build attendance report data for a date range
 */
const buildAttendanceReport = async ({ from, to, department_id }) => {
  let q = `
    SELECT
      e.employee_id          AS "Employee ID",
      e.first_name || ' ' || e.last_name AS "Employee Name",
      d.name                 AS "Department",
      a.date                 AS "Date",
      TO_CHAR(a.check_in, 'HH24:MI')  AS "Check In",
      TO_CHAR(a.check_out,'HH24:MI')  AS "Check Out",
      a.hours_worked         AS "Hours Worked",
      a.overtime             AS "Overtime (h)",
      a.status               AS "Status",
      CASE WHEN a.is_late THEN 'Yes' ELSE 'No' END AS "Late",
      a.work_mode            AS "Work Mode"
    FROM attendance a
    JOIN employees   e ON a.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE a.date BETWEEN $1 AND $2`
  const params = [from, to]
  if (department_id) { params.push(department_id); q += ` AND e.department_id = $${params.length}` }
  q += ` ORDER BY a.date DESC, e.last_name`
  const { rows } = await query(q, params)
  return { title: `Attendance Report (${from} to ${to})`, rows }
}

/**
 * Build performance report data
 */
const buildPerformanceReport = async ({ cycle, department_id }) => {
  let q = `
    SELECT
      e.employee_id          AS "Employee ID",
      e.first_name || ' ' || e.last_name AS "Employee Name",
      d.name                 AS "Department",
      pr.cycle               AS "Cycle",
      pr.type                AS "Type",
      pr.overall_score       AS "Overall Score",
      pr.status              AS "Status",
      pr.manager_comments    AS "Manager Comments",
      pr.submitted_at        AS "Submitted At"
    FROM performance_reviews pr
    JOIN employees   e ON pr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE 1=1`
  const params = []
  if (cycle)         { params.push(cycle);         q += ` AND pr.cycle = $${params.length}` }
  if (department_id) { params.push(department_id); q += ` AND e.department_id = $${params.length}` }
  q += ` ORDER BY pr.overall_score DESC NULLS LAST`
  const { rows } = await query(q, params)
  return { title: `Performance Report${cycle ? ` — ${cycle}` : ''}`, rows }
}

/**
 * Build task completion report
 */
const buildTaskReport = async ({ from, to, department_id }) => {
  let q = `
    SELECT
      t.title                AS "Task Title",
      a.first_name || ' ' || a.last_name AS "Assigned To",
      d.name                 AS "Department",
      t.priority             AS "Priority",
      t.status               AS "Status",
      t.completion_percent   AS "Completion %",
      t.due_date             AS "Due Date",
      t.created_at           AS "Created At"
    FROM tasks t
    JOIN employees   a ON t.assigned_to = a.id
    LEFT JOIN departments d ON a.department_id = d.id
    WHERE 1=1`
  const params = []
  if (from) { params.push(from); q += ` AND t.created_at >= $${params.length}` }
  if (to)   { params.push(to);   q += ` AND t.created_at <= $${params.length}` }
  if (department_id) { params.push(department_id); q += ` AND a.department_id = $${params.length}` }
  q += ` ORDER BY t.created_at DESC`
  const { rows } = await query(q, params)
  return { title: 'Task Completion Report', rows }
}

module.exports = { buildAttendanceReport, buildPerformanceReport, buildTaskReport }
