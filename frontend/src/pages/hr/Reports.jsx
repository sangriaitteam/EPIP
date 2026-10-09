import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Users, Calendar,
  Clock, CheckSquare, Grid
} from 'lucide-react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import StatCard from '../../components/common/StatCard'
import { api } from '../../services/api'
import { employeeService } from '../../services/employeeService'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const REPORT_TYPES = [
  { key: 'attendance', label: 'Monthly Attendance', icon: Clock,       color: 'bg-green-500/10 text-green-500',   desc: 'Check-in/out times, hours worked, late arrivals' },
  { key: 'tasks',      label: 'Task Completion',    icon: CheckSquare, color: 'bg-orange-500/10 text-orange-500', desc: 'Daily/weekly task status and completion rates' },
]

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

// ── Cell color ─────────────────────────────────────────────────────────────
const getCellStyle = (status) => {
  switch (status) {
    case 'present':   return 'bg-green-500 text-white'
    case 'absent':    return 'bg-red-500 text-white'
    case 'leave':     return 'bg-yellow-400 text-white'
    case 'holiday':   return 'bg-blue-400 text-white'
    case 'sunday_ot': return 'bg-purple-500 text-white'
    case 'sunday':    return 'bg-gray-500 text-white'
    case 'future':    return 'bg-slate-700 text-white'
    default:          return 'bg-slate-700 text-white'
  }
}

const getCellLabel = (status, isSunday) => {
  if (isSunday && status === 'sunday_ot') return 'OT'
  if (isSunday) return 'S'
  if (status === 'present') return 'P'
  if (status === 'absent')  return 'A'
  if (status === 'leave')   return 'L'
  if (status === 'holiday') return 'H'
  return '—'
}

// ── All Employees Attendance Grid ──────────────────────────────────────────
const AllEmployeesGrid = ({ data }) => {
  if (!data) return null
  const { all_days, employees, period } = data

  return (
    <div className="space-y-3">

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { color: 'bg-green-500',  label: 'Present (P)' },
          { color: 'bg-red-500',    label: 'Absent (A)' },
          { color: 'bg-yellow-400', label: 'Leave (L)' },
          { color: 'bg-purple-500', label: 'Sunday OT' },
          { color: 'bg-gray-500',   label: 'Sunday' },
          { color: 'bg-blue-400',   label: 'Holiday (H)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs">
            <div className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 ${l.color}`} />
            <span className="text-gray-500 dark:text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-600 shadow-sm">
        <table
          className="text-[10px] border-collapse w-full"
          style={{ minWidth: `${200 + all_days.length * 30}px` }}
        >
          <thead>
            <tr className="bg-gray-100 dark:bg-dark-700 border-b border-gray-200 dark:border-dark-600">
              {/* Name header — sticky */}
              <th className="sticky left-0 z-20 bg-gray-100 dark:bg-dark-700 px-3 py-2.5 text-left font-bold text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-dark-600"
                style={{ minWidth: 180 }}>
                Employee
              </th>

              {/* Day headers */}
              {all_days.map(d => (
                <th key={d.day}
                  className={`py-1.5 text-center font-bold border-r border-gray-200 dark:border-dark-500 last:border-r-0
                    ${d.isSunday ? 'text-purple-500 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}
                  style={{ minWidth: 28, width: 28 }}
                >
                  <div className="leading-tight">{d.day}</div>
                  <div className="text-[8px] opacity-60 leading-tight">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d.date).getDay()]}
                  </div>
                </th>
              ))}

              {/* Summary headers */}
              <th className="px-1 py-2.5 text-center font-bold text-green-600 dark:text-green-400 border-l border-gray-200 dark:border-dark-600" style={{ minWidth: 30 }}>P</th>
              <th className="px-1 py-2.5 text-center font-bold text-red-500" style={{ minWidth: 30 }}>A</th>
              <th className="px-1 py-2.5 text-center font-bold text-purple-500" style={{ minWidth: 30 }}>OT</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((emp, rowIdx) => {
              const isEven = rowIdx % 2 === 0
              const rowBg  = isEven ? 'bg-white dark:bg-dark-800' : 'bg-gray-50 dark:bg-dark-750'
              const stickyBg = isEven
                ? 'bg-white dark:bg-dark-800'
                : 'bg-gray-50 dark:bg-dark-750'

              return (
                <tr key={emp.id} className={`border-t border-gray-200 dark:border-dark-600 ${rowBg}`}>

                  {/* Sticky name cell */}
                  <td className={`sticky left-0 z-10 px-3 py-1.5 border-r border-gray-200 dark:border-dark-600 ${stickyBg}`}
                    style={{ minWidth: 180 }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center text-[8px] font-bold text-primary-600 dark:text-primary-400 flex-shrink-0">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate text-[10px] leading-tight">{emp.name}</p>
                        <p className="text-[9px] text-gray-400 truncate leading-tight">{emp.emp_code}</p>
                      </div>
                    </div>
                  </td>

                  {/* Day cells */}
                  {emp.days.map(d => (
                    <td key={d.day} className="px-0 py-1 text-center border-r border-gray-200 dark:border-dark-500 last:border-r-0"
                      style={{ width: 28 }}>
                      <div
                        title={[
                          `${emp.name}`,
                          `Date: ${d.date}`,
                          `Status: ${d.status}`,
                          d.check_in  ? `In: ${new Date(d.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}` : '',
                          d.check_out ? `Out: ${new Date(d.check_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}` : '',
                          d.hours_worked ? `Hours: ${d.hours_worked}h` : '',
                        ].filter(Boolean).join(' | ')}
                        className={`mx-auto w-5 h-5 rounded-[3px] flex items-center justify-center font-bold text-[8px] cursor-default select-none transition-transform hover:scale-125 ${getCellStyle(d.status)}`}
                      >
                        {getCellLabel(d.status, d.isSunday)}
                      </div>
                    </td>
                  ))}

                  {/* Summary */}
                  <td className="px-1 py-1 text-center font-bold text-green-600 dark:text-green-400 text-[10px] border-l border-gray-200 dark:border-dark-600">{emp.summary.present}</td>
                  <td className="px-1 py-1 text-center font-bold text-red-500 text-[10px]">{emp.summary.absent}</td>
                  <td className="px-1 py-1 text-center font-bold text-purple-500 text-[10px]">{emp.summary.sunday_ot}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 text-right">
        {employees.length} employees · {period} · Hover a cell for check-in details
      </p>
    </div>
  )
}

// ── PDF for All Employees grid ────────────────────────────────────────────
const generateAllEmpPDF = (data) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) { toast.error('Please allow popups for PDF generation'); return }

  const { all_days, employees, period } = data
  const companyName = 'Sangria Edutainment Pvt Ltd'
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const cellColor = (status) => {
    switch (status) {
      case 'present':   return '#22c55e'   // green
      case 'absent':    return '#ef4444'   // red
      case 'leave':     return '#facc15'   // yellow
      case 'holiday':   return '#60a5fa'   // blue
      case 'sunday_ot': return '#a855f7'   // purple
      case 'sunday':    return '#6b7280'   // gray
      default:          return '#334155'   // dark slate navy
    }
  }

  const cellText = (status, isSunday) => {
    if (isSunday && status === 'sunday_ot') return 'OT'
    if (isSunday) return 'S'
    if (status === 'present')  return 'P'
    if (status === 'absent')   return 'A'
    if (status === 'leave')    return 'L'
    if (status === 'holiday')  return 'H'
    return ''
  }

  const cellFg = (_status) => '#ffffff'

  // Build day-header row
  const dayHeaders = all_days.map(d => {
    const dow = ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d.date).getDay()]
    const sunStyle = d.isSunday ? 'color:#a855f7;font-weight:700;' : ''
    return `<th style="width:22px;padding:3px 1px;text-align:center;font-size:9px;${sunStyle}">${d.day}<br/><span style="font-size:7px;opacity:.7">${dow}</span></th>`
  }).join('')

  // Build employee rows
  const empRows = employees.map((emp, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb'
    const dayCells = emp.days.map(d => {
      const bg = cellColor(d.status)
      const fg = cellFg(d.status)
      const lbl = cellText(d.status, d.isSunday)
      return `<td style="padding:1px;text-align:center;">
        <div style="width:18px;height:18px;background:${bg};color:${fg};border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;margin:auto;">${lbl}</div>
      </td>`
    }).join('')

    return `<tr style="background:${bg}">
      <td style="padding:4px 6px;font-size:9px;font-weight:600;white-space:nowrap;border-right:1px solid #e5e7eb;">${emp.name}</td>
      <td style="padding:4px 6px;font-size:8px;color:#6b7280;white-space:nowrap;border-right:1px solid #e5e7eb;">${emp.emp_code || ''}</td>
      ${dayCells}
      <td style="padding:4px 4px;text-align:center;font-size:9px;font-weight:700;color:#16a34a;border-left:1px solid #e5e7eb;">${emp.summary.present}</td>
      <td style="padding:4px 4px;text-align:center;font-size:9px;font-weight:700;color:#ef4444;">${emp.summary.absent}</td>
      <td style="padding:4px 4px;text-align:center;font-size:9px;font-weight:700;color:#a855f7;">${emp.summary.sunday_ot}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Attendance Register — ${period}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;background:#fff;color:#1e293b}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6366f1;padding-bottom:12px;margin-bottom:16px}
    .company{font-size:16px;font-weight:700;color:#6366f1}
    .subtitle{font-size:12px;color:#475569;margin-top:3px}
    .meta{text-align:right;font-size:11px;color:#64748b}
    .meta strong{color:#1e293b;font-size:13px;display:block;margin-bottom:2px}
    .legend{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;padding:8px 12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0}
    .leg-item{display:flex;align-items:center;gap:5px;font-size:9px;color:#475569}
    .leg-dot{width:14px;height:14px;border-radius:2px;flex-shrink:0}
    table{border-collapse:collapse;width:100%}
    th{background:#6366f1;color:#fff;padding:5px 4px;font-size:9px;font-weight:600;text-align:center;border-right:1px solid rgba(255,255,255,0.2)}
    th:first-child{text-align:left;min-width:140px}
    th:nth-child(2){min-width:80px}
    td{border-bottom:1px solid #f1f5f9;vertical-align:middle}
    tr:hover td{background:#f0f4ff!important}
    .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8}
    @media print{
      body{padding:10px}
      @page{size:A3 landscape;margin:8mm}
      table{page-break-inside:auto}
      tr{page-break-inside:avoid}
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${companyName}</div>
      <div class="subtitle">Monthly Attendance Register — ${period} &nbsp;·&nbsp; ${employees.length} Employees</div>
    </div>
    <div class="meta">
      <strong>Period: ${period}</strong>
      Generated: ${today}
    </div>
  </div>

  <div class="legend">
    ${[
      ['#22c55e','Present (P)'],
      ['#ef4444','Absent (A)'],
      ['#facc15','Leave (L)'],
      ['#a855f7','Sunday OT'],
      ['#6b7280','Sunday (S)'],
      ['#60a5fa','Holiday (H)'],
    ].map(([c,l]) => `<div class="leg-item"><div class="leg-dot" style="background:${c}"></div>${l}</div>`).join('')}
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;padding:5px 6px;">Employee</th>
        <th style="text-align:left;padding:5px 6px;">ID</th>
        ${dayHeaders}
        <th style="padding:5px 4px;color:#86efac;">P</th>
        <th style="padding:5px 4px;color:#fca5a5;">A</th>
        <th style="padding:5px 4px;color:#d8b4fe;">OT</th>
      </tr>
    </thead>
    <tbody>${empRows}</tbody>
  </table>

  <div class="footer">
    <span>Sangria Edutainment — EPIP · Attendance Register</span>
    <span>Confidential</span>
  </div>

  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1200)}</script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}

// ── PDF for single employee ────────────────────────────────────────────────
const generatePDF = (data, reportType, employee, periodLabel) => {
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) { toast.error('Please allow popups for PDF generation'); return }

  const companyName = 'Sangria Edutainment Pvt Ltd'
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  let contentHTML = ''

  if (reportType === 'attendance') {
    const s = data.summary
    contentHTML = `
      <div class="summary-grid">
        <div class="summary-card green"><div class="num">${s.present || 0}</div><div class="lbl">Present</div></div>
        <div class="summary-card red"><div class="num">${s.absent || 0}</div><div class="lbl">Absent</div></div>
        <div class="summary-card yellow"><div class="num">${s.leave || 0}</div><div class="lbl">Leave</div></div>
        <div class="summary-card orange"><div class="num">${s.late || 0}</div><div class="lbl">Late</div></div>
        <div class="summary-card blue"><div class="num">${s.total_hours || 0}h</div><div class="lbl">Total Hours</div></div>
        <div class="summary-card purple"><div class="num">${s.attendance_pct || 0}%</div><div class="lbl">Attendance</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>OT</th><th>Status</th><th>Late</th><th>Mode</th></tr></thead>
        <tbody>
          ${(data.records || []).map(r => `
            <tr>
              <td>${r.date}</td>
              <td>${r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
              <td>${r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
              <td>${r.hours_worked || '—'}</td>
              <td>${r.overtime || '0'}</td>
              <td><span class="badge ${r.status}">${r.status}</span></td>
              <td>${r.is_late ? '<span class="badge late">Late</span>' : 'On time'}</td>
              <td>${r.work_mode || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  } else if (reportType === 'tasks') {
    const s = data.summary
    contentHTML = `
      <div class="summary-grid">
        <div class="summary-card blue"><div class="num">${s.total}</div><div class="lbl">Total Tasks</div></div>
        <div class="summary-card green"><div class="num">${s.done}</div><div class="lbl">Completed</div></div>
        <div class="summary-card orange"><div class="num">${s.in_progress}</div><div class="lbl">In Progress</div></div>
        <div class="summary-card gray"><div class="num">${s.todo}</div><div class="lbl">To Do</div></div>
        <div class="summary-card purple"><div class="num">${s.avg_completion}%</div><div class="lbl">Avg Completion</div></div>
      </div>
      <table>
        <thead><tr><th>Task</th><th>Priority</th><th>Status</th><th>Completion</th><th>Due Date</th></tr></thead>
        <tbody>
          ${(data.records || []).map(r => `
            <tr>
              <td>${r.title}</td>
              <td><span class="badge ${r.priority}">${r.priority}</span></td>
              <td><span class="badge ${r.status}">${r.status.replace('_',' ')}</span></td>
              <td>
                <div class="progress-bar"><div class="progress-fill" style="width:${r.completion_percent||0}%"></div></div>
                <span style="font-size:11px">${r.completion_percent||0}%</span>
              </td>
              <td>${r.due_date ? formatDate(r.due_date) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${REPORT_TYPES.find(r=>r.key===reportType)?.label} — ${employee?.name || ''}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:32px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #6366f1;padding-bottom:16px;margin-bottom:24px}
    .company{font-size:20px;font-weight:700;color:#6366f1}
    .report-title{font-size:15px;color:#475569;margin-top:4px}
    .meta{text-align:right;font-size:12px;color:#64748b}
    .meta strong{color:#1e293b;font-size:14px;display:block;margin-bottom:4px}
    .emp-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;margin-bottom:20px;display:flex;gap:30px;flex-wrap:wrap}
    .emp-field label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
    .emp-field span{display:block;font-weight:600;color:#1e293b;font-size:13px}
    .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin-bottom:20px}
    .summary-card{background:#f8fafc;border-radius:10px;padding:14px;text-align:center;border:1px solid #e2e8f0}
    .summary-card .num{font-size:24px;font-weight:700}
    .summary-card .lbl{font-size:11px;color:#64748b;margin-top:3px}
    .summary-card.green .num{color:#16a34a}.summary-card.red .num{color:#dc2626}.summary-card.yellow .num{color:#ca8a04}
    .summary-card.orange .num{color:#ea580c}.summary-card.blue .num{color:#2563eb}.summary-card.purple .num{color:#7c3aed}
    .summary-card.gray .num{color:#6b7280}
    table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px}
    th{background:#6366f1;color:#fff;padding:9px 10px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
    tr:nth-child(even) td{background:#f8fafc}
    .badge{padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;text-transform:capitalize;display:inline-block}
    .badge.present,.badge.done{background:#dcfce7;color:#16a34a}
    .badge.absent{background:#fee2e2;color:#dc2626}
    .badge.leave,.badge.in_progress{background:#fef9c3;color:#ca8a04}
    .badge.late{background:#ffedd5;color:#ea580c}
    .badge.todo,.badge.pending{background:#f1f5f9;color:#64748b}
    .badge.high{background:#fee2e2;color:#dc2626}.badge.medium{background:#fef9c3;color:#ca8a04}.badge.low{background:#dcfce7;color:#16a34a}
    .progress-bar{height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin-bottom:2px}
    .progress-fill{height:100%;background:#6366f1;border-radius:4px}
    .footer{margin-top:30px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}
    @media print{body{padding:20px}table{page-break-inside:auto}tr{page-break-inside:avoid}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${companyName}</div>
      <div class="report-title">${REPORT_TYPES.find(r=>r.key===reportType)?.label || 'Report'}</div>
    </div>
    <div class="meta">
      <strong>Period: ${periodLabel}</strong>
      Generated: ${today}
    </div>
  </div>
  <div class="emp-section">
    <div class="emp-field"><label>Employee Name</label><span>${employee?.name || '—'}</span></div>
    <div class="emp-field"><label>Employee ID</label><span>${employee?.emp_code || '—'}</span></div>
    <div class="emp-field"><label>Designation</label><span>${employee?.designation || '—'}</span></div>
    <div class="emp-field"><label>Department</label><span>${employee?.department || '—'}</span></div>
  </div>
  ${contentHTML}
  <div class="footer">
    <span>Sangria Edutainment — EPIP</span>
    <span>Confidential — ${companyName}</span>
  </div>
  <script>window.onload=function(){window.print();setTimeout(()=>window.close(),1000)}</script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}

// ── Excel download ─────────────────────────────────────────────────────────
const downloadExcel = (employeeId, reportType, year, month) => {
  const token = localStorage.getItem('epip_token')
  const url   = `${BASE_URL}/reports/employee/${employeeId}/${reportType}?year=${year}&month=${month}&format=excel`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `report_${reportType}_${year}_${month}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
    })
    .catch(() => toast.error('Download failed'))
}

// ── Excel download for All Employees ──────────────────────────────────────
const downloadAllEmpExcel = (year, month) => {
  const token = localStorage.getItem('epip_token')
  const url   = `${BASE_URL}/reports/all-employees/attendance?year=${year}&month=${month}&format=excel`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = `AllEmployees_Attendance_${MONTHS[month-1]}_${year}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
    })
    .catch(() => toast.error('Excel download failed'))
}

// ── Main Component ─────────────────────────────────────────────────────────
const HRReports = () => {
  const now = new Date()
  const [employees,    setEmployees]    = useState([])
  const [selectedEmp,  setSelectedEmp]  = useState('')
  const [selectedType, setSelectedType] = useState('attendance')
  const [year,         setYear]         = useState(now.getFullYear())
  const [month,        setMonth]        = useState(now.getMonth() + 1)
  const [loading,      setLoading]      = useState(false)
  const [reportData,   setReportData]   = useState(null)   // single employee
  const [allEmpData,   setAllEmpData]   = useState(null)   // all employees grid
  const [empObj,       setEmpObj]       = useState(null)

  const isAllEmployees = selectedEmp === 'all'

  useEffect(() => {
    employeeService.getAll()
      .then(d => { if (d?.length) setEmployees(d) })
      .catch(() => {})
  }, [])

  const periodLabel = `${MONTHS[month - 1]} ${year}`

  const handleGenerate = async () => {
    if (!selectedEmp) { toast.error('Please select an employee'); return }
    setLoading(true)
    setReportData(null)
    setAllEmpData(null)
    try {
      if (isAllEmployees) {
        if (selectedType !== 'attendance') {
          toast.error('All Employees view is only available for Monthly Attendance')
          setLoading(false)
          return
        }
        const res = await api.get(`/reports/all-employees/attendance?year=${year}&month=${month}`)
        if (res.success) {
          setAllEmpData(res.data)
          toast.success(`Loaded ${res.data.total_employees} employees ✅`)
        } else {
          toast.error(res.message || 'Failed to generate report')
        }
      } else {
        const res = await api.get(`/reports/employee/${selectedEmp}/${selectedType}?year=${year}&month=${month}`)
        if (res.success) {
          setReportData(res.data)
          setEmpObj(res.data.employee)
          toast.success('Report loaded ✅')
        } else {
          toast.error(res.message || 'Failed to generate report')
        }
      }
    } catch { toast.error('Cannot connect to server') }
    setLoading(false)
  }

  const handlePDF   = () => { if (reportData) generatePDF(reportData, selectedType, empObj, periodLabel) }
  const handleAllEmpPDF   = () => { if (allEmpData) generateAllEmpPDF(allEmpData) }
  const handleAllEmpExcel = () => {
    if (!allEmpData) return
    downloadAllEmpExcel(year, month)
    toast.success('Downloading Excel...')
  }
  const handleExcel = () => {
    if (!selectedEmp) { toast.error('Generate report first'); return }
    downloadExcel(selectedEmp, selectedType, year, month)
    toast.success('Downloading Excel...')
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
  const selectedReportType = REPORT_TYPES.find(r => r.key === selectedType)

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Reports & Export</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Generate per-employee monthly reports • PDF & Excel
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {REPORT_TYPES.map((rt, i) => (
          <StatCard key={rt.key} title={rt.label} value={rt.key === selectedType ? '●' : '○'}
            icon={rt.icon} color={['green', 'blue', 'orange', 'purple'][i]} delay={i * 0.1} />
        ))}
      </motion.div>

      {/* Controls card */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Generate Report</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select employee, report type and period</p>
          </CardHeader>
          <CardBody className="space-y-4">

            {/* Report type selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Report Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REPORT_TYPES.map(rt => (
                  <button key={rt.key}
                    onClick={() => { setSelectedType(rt.key); setReportData(null); setAllEmpData(null) }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedType === rt.key
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${rt.color}`}>
                      <rt.icon size={15} />
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{rt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight line-clamp-2">{rt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Employee + Month + Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Employee dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  <Users size={11} className="inline mr-1" /> Employee *
                </label>
                <select
                  value={selectedEmp}
                  onChange={e => { setSelectedEmp(e.target.value); setReportData(null); setAllEmpData(null) }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select employee</option>
                  {/* ── All Employees ── */}
                  <option value="all">👥  All Employees</option>
                  {employees.map(e => {
                    const name = e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim()
                    const code = e.company_provided_id || e.employee_id || e.id
                    return <option key={e.id} value={e.id}>{name} ({code})</option>
                  })}
                </select>
                {isAllEmployees && selectedType !== 'attendance' && (
                  <p className="text-[10px] text-yellow-500 mt-1">
                    ⚠️ All Employees view works only with Monthly Attendance
                  </p>
                )}
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  <Calendar size={11} className="inline mr-1" /> Month
                </label>
                <select value={month}
                  onChange={e => { setMonth(parseInt(e.target.value)); setReportData(null); setAllEmpData(null) }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Year
                </label>
                <select value={year}
                  onChange={e => { setYear(parseInt(e.target.value)); setReportData(null); setAllEmpData(null) }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button onClick={handleGenerate}
                disabled={loading || !selectedEmp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-md shadow-primary-500/25"
              >
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Loading…</>
                  : <><FileText size={15} /> Generate Report</>
                }
              </button>

              {reportData && !isAllEmployees && (
                <>
                  <button onClick={handlePDF}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                    <Download size={15} /> Download PDF
                  </button>
                  <button onClick={handleExcel}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                    <Download size={15} /> Download Excel
                  </button>
                </>
              )}
            </div>

          </CardBody>
        </Card>
      </motion.div>

      {/* ── All Employees Grid ── */}
      <AnimatePresence>
        {allEmpData && isAllEmployees && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      <Grid size={14} className="text-primary-500" />
                      Monthly Attendance Register — All Employees
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {allEmpData.period} · {allEmpData.total_employees} employees
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600">
                    <Clock size={11} /> Monthly Attendance
                  </span>
                </div>
              </CardHeader>
              <CardBody>
                <AllEmployeesGrid data={allEmpData} />

                {/* Download buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-600 mt-4">
                  <button onClick={handleAllEmpPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                    <Download size={14} /> Download PDF
                  </button>
                  <button onClick={handleAllEmpExcel}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                    <Download size={14} /> Download Excel
                  </button>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Single Employee Report ── */}
      <AnimatePresence>
        {reportData && !isAllEmployees && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {empObj && <Avatar name={empObj.name} size="md" />}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {selectedReportType?.label} — {empObj?.name}
                      </h3>
                      <p className="text-xs text-gray-400">{periodLabel} · {empObj?.designation} · {empObj?.department}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${selectedReportType?.color}`}>
                    <selectedReportType.icon size={12} />
                    {selectedReportType?.label}
                  </div>
                </div>
              </CardHeader>
              <CardBody>

                {/* Attendance */}
                {selectedType === 'attendance' && reportData.summary && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                      {[
                        { label: 'Present', val: reportData.summary.present    || 0,                   color: 'text-green-600 bg-green-500/10' },
                        { label: 'Absent',  val: reportData.summary.absent     || 0,                   color: 'text-red-500 bg-red-500/10' },
                        { label: 'Leave',   val: reportData.summary.leave      || 0,                   color: 'text-yellow-600 bg-yellow-500/10' },
                        { label: 'Late',    val: reportData.summary.late       || 0,                   color: 'text-orange-500 bg-orange-500/10' },
                        { label: 'Hours',   val: `${reportData.summary.total_hours || 0}h`,            color: 'text-blue-600 bg-blue-500/10' },
                        { label: 'Rate',    val: `${reportData.summary.attendance_pct || 0}%`,         color: 'text-purple-600 bg-purple-500/10' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                          <p className="text-xl font-bold">{s.val}</p>
                          <p className="text-xs opacity-70">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ minWidth: '600px' }}>
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-700">
                            {['Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Late', 'Mode'].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                          {reportData.records?.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                              <td className="px-3 py-2">{r.date}</td>
                              <td className="px-3 py-2 text-green-600">{r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                              <td className="px-3 py-2 text-red-500">{r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                              <td className="px-3 py-2">{r.hours_worked || '—'}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                                  r.status === 'present' ? 'bg-green-500/10 text-green-600'
                                  : r.status === 'absent' ? 'bg-red-500/10 text-red-500'
                                  : 'bg-yellow-500/10 text-yellow-600'
                                }`}>{r.status}</span>
                              </td>
                              <td className="px-3 py-2">{r.is_late ? <span className="text-orange-500 font-semibold">Late</span> : 'On time'}</td>
                              <td className="px-3 py-2 capitalize">{r.work_mode || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Tasks */}
                {selectedType === 'tasks' && reportData.summary && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                      {[
                        { label: 'Total',       val: reportData.summary.total,                color: 'text-blue-600 bg-blue-500/10' },
                        { label: 'Done',        val: reportData.summary.done,                 color: 'text-green-600 bg-green-500/10' },
                        { label: 'In Progress', val: reportData.summary.in_progress,          color: 'text-orange-500 bg-orange-500/10' },
                        { label: 'To Do',       val: reportData.summary.todo,                 color: 'text-gray-500 bg-gray-500/10' },
                        { label: 'Avg %',       val: `${reportData.summary.avg_completion}%`, color: 'text-purple-600 bg-purple-500/10' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                          <p className="text-xl font-bold">{s.val}</p>
                          <p className="text-xs opacity-70">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {reportData.records?.length === 0
                      ? <p className="text-center text-gray-400 py-6">No tasks found for this period</p>
                      : <div className="space-y-2">
                          {reportData.records?.slice(0, 8).map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-dark-700">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${t.status === 'done' ? 'bg-green-500/10 text-green-600' : t.status === 'in_progress' ? 'bg-orange-500/10 text-orange-500' : 'bg-gray-500/10 text-gray-500'}`}>{t.status.replace('_', ' ')}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.priority === 'high' ? 'bg-red-500/10 text-red-500' : t.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-green-500/10 text-green-600'}`}>{t.priority}</span>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-primary-500 flex-shrink-0">{t.completion_percent || 0}%</span>
                            </div>
                          ))}
                        </div>
                    }
                  </>
                )}

                {/* Footer buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-dark-600 mt-4">
                  <button onClick={handlePDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={handleExcel}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
                    <Download size={14} /> Excel
                  </button>
                </div>

              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default HRReports
