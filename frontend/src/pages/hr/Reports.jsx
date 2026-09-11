import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Users, Calendar, ChevronDown,
  Clock, Target, CheckSquare, TrendingUp, Loader, AlertCircle
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
  { key: 'attendance',  label: 'Monthly Attendance',      icon: Clock,        color: 'bg-green-500/10 text-green-500',   desc: 'Check-in/out times, hours worked, late arrivals' },
  { key: 'performance', label: 'Monthly Work Performance', icon: TrendingUp,   color: 'bg-blue-500/10 text-blue-500',    desc: 'Performance reviews, scores, manager feedback' },
  { key: 'tasks',       label: 'Task Completion',          icon: CheckSquare,  color: 'bg-orange-500/10 text-orange-500', desc: 'Daily/weekly task status and completion rates' },
  { key: 'kpi',         label: 'Monthly KPI',              icon: Target,       color: 'bg-purple-500/10 text-purple-500', desc: 'Goal achievement, KPI scores, weighted performance' },
]

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

// ── PDF Generator ─────────────────────────────────────────────────────────────
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
  }

  else if (reportType === 'performance') {
    contentHTML = `
      <div class="section-title">Performance Reviews</div>
      ${data.reviews?.length === 0 ? '<p class="no-data">No performance reviews for this period.</p>' : ''}
      ${(data.reviews || []).map(r => `
        <div class="review-card">
          <div class="review-header">
            <span><strong>Cycle:</strong> ${r.cycle}</span>
            <span><strong>Type:</strong> ${r.type}</span>
            <span><strong>Status:</strong> <span class="badge ${r.status}">${r.status}</span></span>
            <span class="score">${r.overall_score || '—'}<small>/100</small></span>
          </div>
          ${r.manager_comments ? `<div class="comment"><strong>Manager Comments:</strong> ${r.manager_comments}</div>` : ''}
        </div>`).join('')}
      ${data.parameters?.length ? `
        <div class="section-title" style="margin-top:20px">Parameter Breakdown</div>
        <table>
          <thead><tr><th>Parameter</th><th>Score</th><th>Comments</th></tr></thead>
          <tbody>${data.parameters.map(p => `<tr><td>${p.name}</td><td>${p.score}</td><td>${p.comments||'—'}</td></tr>`).join('')}</tbody>
        </table>` : ''}
      ${data.self_assessment ? `
        <div class="section-title" style="margin-top:20px">Self Assessment (${data.self_assessment.period})</div>
        <table>
          <thead><tr><th>Area</th><th>Response</th></tr></thead>
          <tbody>
            <tr><td>Achievements</td><td>${data.self_assessment.achievements||'—'}</td></tr>
            <tr><td>Challenges</td><td>${data.self_assessment.challenges||'—'}</td></tr>
            <tr><td>Strengths</td><td>${data.self_assessment.strengths||'—'}</td></tr>
            <tr><td>Areas for Improvement</td><td>${data.self_assessment.weaknesses||'—'}</td></tr>
            <tr><td>Career Goals</td><td>${data.self_assessment.career_goals||'—'}</td></tr>
          </tbody>
        </table>` : ''}`
  }

  else if (reportType === 'tasks') {
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

  else if (reportType === 'kpi') {
    const s = data.kpi_summary
    contentHTML = `
      <div class="summary-grid">
        <div class="summary-card blue"><div class="num">${s.total_goals}</div><div class="lbl">Total Goals</div></div>
        <div class="summary-card green"><div class="num">${s.achieved}</div><div class="lbl">Achieved</div></div>
        <div class="summary-card orange"><div class="num">${s.in_progress}</div><div class="lbl">In Progress</div></div>
        <div class="summary-card purple"><div class="num">${s.weighted_score}%</div><div class="lbl">KPI Score</div></div>
        <div class="summary-card teal"><div class="num">${s.attendance_pct}%</div><div class="lbl">Attendance</div></div>
      </div>
      <table>
        <thead><tr><th>Goal / KPI</th><th>Type</th><th>Metric</th><th>Target</th><th>Actual</th><th>Completion</th><th>Weight</th></tr></thead>
        <tbody>
          ${(data.records || []).map(g => `
            <tr>
              <td>${g.title}</td>
              <td>${g.type}</td>
              <td>${g.kpi_metric||'—'}</td>
              <td>${g.target_value||'—'}</td>
              <td>${g.actual_value||'—'}</td>
              <td>
                <div class="progress-bar"><div class="progress-fill" style="width:${g.completion_percent||0}%"></div></div>
                <span style="font-size:11px">${g.completion_percent||0}%</span>
              </td>
              <td>${g.weightage||0}%</td>
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
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 32px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 24px; }
    .company { font-size:20px; font-weight:700; color:#6366f1; }
    .report-title { font-size:15px; color:#475569; margin-top:4px; }
    .meta { text-align:right; font-size:12px; color:#64748b; }
    .meta strong { color:#1e293b; font-size:14px; display:block; margin-bottom:4px; }
    .emp-section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 18px; margin-bottom:20px; display:flex; gap:30px; flex-wrap:wrap; }
    .emp-field { }
    .emp-field label { font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:.05em; }
    .emp-field span { display:block; font-weight:600; color:#1e293b; font-size:13px; }
    .summary-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:12px; margin-bottom:20px; }
    .summary-card { background:#f8fafc; border-radius:10px; padding:14px; text-align:center; border:1px solid #e2e8f0; }
    .summary-card .num { font-size:24px; font-weight:700; }
    .summary-card .lbl { font-size:11px; color:#64748b; margin-top:3px; }
    .summary-card.green .num{color:#16a34a;} .summary-card.red .num{color:#dc2626;} .summary-card.yellow .num{color:#ca8a04;}
    .summary-card.orange .num{color:#ea580c;} .summary-card.blue .num{color:#2563eb;} .summary-card.purple .num{color:#7c3aed;}
    .summary-card.gray .num{color:#6b7280;} .summary-card.teal .num{color:#0d9488;}
    table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px; }
    th { background:#6366f1; color:#fff; padding:9px 10px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    td { padding:8px 10px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
    tr:nth-child(even) td { background:#f8fafc; }
    .badge { padding:2px 8px; border-radius:20px; font-size:10px; font-weight:600; text-transform:capitalize; display:inline-block; }
    .badge.present,.badge.done,.badge.completed { background:#dcfce7; color:#16a34a; }
    .badge.absent { background:#fee2e2; color:#dc2626; }
    .badge.leave,.badge.in_progress { background:#fef9c3; color:#ca8a04; }
    .badge.late { background:#ffedd5; color:#ea580c; }
    .badge.pending,.badge.todo { background:#f1f5f9; color:#64748b; }
    .badge.high { background:#fee2e2; color:#dc2626; }
    .badge.medium { background:#fef9c3; color:#ca8a04; }
    .badge.low { background:#dcfce7; color:#16a34a; }
    .progress-bar { height:7px; background:#e2e8f0; border-radius:4px; overflow:hidden; margin-bottom:2px; }
    .progress-fill { height:100%; background:#6366f1; border-radius:4px; }
    .section-title { font-weight:700; font-size:14px; color:#1e293b; margin-bottom:10px; padding-bottom:5px; border-bottom:2px solid #e2e8f0; }
    .review-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; margin-bottom:10px; }
    .review-header { display:flex; gap:20px; flex-wrap:wrap; align-items:center; }
    .score { font-size:22px; font-weight:700; color:#6366f1; margin-left:auto; }
    .score small { font-size:12px; color:#94a3b8; }
    .comment { margin-top:8px; font-size:12px; color:#475569; font-style:italic; }
    .no-data { color:#94a3b8; text-align:center; padding:20px; }
    .footer { margin-top:30px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; }
    @media print {
      body { padding: 20px; }
      .no-print { display:none; }
      table { page-break-inside:auto; }
      tr { page-break-inside:avoid; }
    }
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
    <span>EPIP — Employee Performance Intelligence Platform</span>
    <span>Confidential — ${companyName}</span>
  </div>

  <script>
    window.onload = function() {
      window.print()
      setTimeout(() => window.close(), 1000)
    }
  </script>
</body>
</html>`

  printWindow.document.write(html)
  printWindow.document.close()
}

// ── Excel download via token ───────────────────────────────────────────────
const downloadExcel = (employeeId, reportType, year, month) => {
  const token = localStorage.getItem('epip_token')
  const url = `${BASE_URL}/reports/employee/${employeeId}/${reportType}?year=${year}&month=${month}&format=excel`
  const a = document.createElement('a')
  a.href = url
  a.style.display = 'none'
  // Use fetch to include auth header
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const objUrl = URL.createObjectURL(blob)
      a.href = objUrl
      a.download = `report_${reportType}_${year}_${month}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
    })
    .catch(() => toast.error('Download failed'))
}

// ── Main Component ─────────────────────────────────────────────────────────
const HRReports = () => {
  const now = new Date()
  const [employees,   setEmployees]   = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [selectedType,setSelectedType]= useState('attendance')
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth() + 1)
  const [loading,     setLoading]     = useState(false)
  const [reportData,  setReportData]  = useState(null)
  const [empObj,      setEmpObj]      = useState(null)

  useEffect(() => {
    employeeService.getAll().then(d => {
      if (d?.length) setEmployees(d)
    }).catch(() => {})
  }, [])

  const periodLabel = `${MONTHS[month-1]} ${year}`

  const handleGenerate = async () => {
    if (!selectedEmp) { toast.error('Please select an employee'); return }
    setLoading(true)
    setReportData(null)
    try {
      const res = await api.get(`/reports/employee/${selectedEmp}/${selectedType}?year=${year}&month=${month}`)
      if (res.success) {
        setReportData(res.data)
        setEmpObj(res.data.employee)
        toast.success('Report data loaded ✅')
      } else {
        toast.error(res.message || 'Failed to generate report')
      }
    } catch { toast.error('Cannot connect to server') }
    setLoading(false)
  }

  const handlePDF = () => {
    if (!reportData) return
    generatePDF(reportData, selectedType, empObj, periodLabel)
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
            icon={rt.icon} color={['green','blue','orange','purple'][i]} delay={i*0.1} />
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Generate Report</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select employee, report type and period</p>
          </CardHeader>
          <CardBody className="space-y-4">

            {/* Report type selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Report Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {REPORT_TYPES.map(rt => (
                  <button
                    key={rt.key}
                    onClick={() => { setSelectedType(rt.key); setReportData(null) }}
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

            {/* Employee + Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Employee */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  <Users size={11} className="inline mr-1" /> Employee *
                </label>
                <select
                  value={selectedEmp}
                  onChange={e => { setSelectedEmp(e.target.value); setReportData(null) }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select employee</option>
                  {employees.map(e => {
                    const name = e.name || `${e.first_name||''} ${e.last_name||''}`.trim()
                    return <option key={e.id} value={e.id}>{name} ({e.employee_id || e.id})</option>
                  })}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  <Calendar size={11} className="inline mr-1" /> Month
                </label>
                <select
                  value={month}
                  onChange={e => { setMonth(parseInt(e.target.value)); setReportData(null) }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Year
                </label>
                <select
                  value={year}
                  onChange={e => { setYear(parseInt(e.target.value)); setReportData(null) }}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedEmp}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 transition-colors shadow-md shadow-primary-500/25"
              >
                {loading
                  ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Loading…</>
                  : <><FileText size={15} /> Generate Report</>
                }
              </button>

              {reportData && (
                <>
                  <button
                    onClick={handlePDF}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    <Download size={15} /> Download PDF
                  </button>
                  <button
                    onClick={handleExcel}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <Download size={15} /> Download Excel
                  </button>
                </>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Report Preview */}
      <AnimatePresence>
        {reportData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
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

                {/* Attendance preview */}
                {selectedType === 'attendance' && reportData.summary && (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                      {[
                        { label: 'Present',    val: reportData.summary.present    || 0, color: 'text-green-600 bg-green-500/10' },
                        { label: 'Absent',     val: reportData.summary.absent     || 0, color: 'text-red-500 bg-red-500/10' },
                        { label: 'Leave',      val: reportData.summary.leave      || 0, color: 'text-yellow-600 bg-yellow-500/10' },
                        { label: 'Late',       val: reportData.summary.late       || 0, color: 'text-orange-500 bg-orange-500/10' },
                        { label: 'Hours',      val: `${reportData.summary.total_hours||0}h`, color: 'text-blue-600 bg-blue-500/10' },
                        { label: 'Rate',       val: `${reportData.summary.attendance_pct||0}%`, color: 'text-purple-600 bg-purple-500/10' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                          <p className="text-xl font-bold">{s.val}</p>
                          <p className="text-xs opacity-70">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-700">
                            {['Date','Check In','Check Out','Hours','Status','Late','Mode'].map(h => (
                              <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                          {reportData.records?.slice(0,15).map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                              <td className="px-3 py-2">{r.date}</td>
                              <td className="px-3 py-2 text-green-600">{r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                              <td className="px-3 py-2 text-red-500">{r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                              <td className="px-3 py-2">{r.hours_worked || '—'}</td>
                              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${r.status==='present'?'bg-green-500/10 text-green-600':r.status==='absent'?'bg-red-500/10 text-red-500':'bg-yellow-500/10 text-yellow-600'}`}>{r.status}</span></td>
                              <td className="px-3 py-2">{r.is_late ? <span className="text-orange-500 font-semibold">Late</span> : 'On time'}</td>
                              <td className="px-3 py-2 capitalize">{r.work_mode||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.records?.length > 15 && (
                        <p className="text-xs text-gray-400 text-center py-2">+ {reportData.records.length - 15} more rows in PDF/Excel</p>
                      )}
                    </div>
                  </>
                )}

                {/* Tasks preview */}
                {selectedType === 'tasks' && reportData.summary && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                      {[
                        { label: 'Total',       val: reportData.summary.total,          color: 'text-blue-600 bg-blue-500/10' },
                        { label: 'Done',        val: reportData.summary.done,           color: 'text-green-600 bg-green-500/10' },
                        { label: 'In Progress', val: reportData.summary.in_progress,    color: 'text-orange-500 bg-orange-500/10' },
                        { label: 'To Do',       val: reportData.summary.todo,           color: 'text-gray-500 bg-gray-500/10' },
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
                          {reportData.records?.slice(0,8).map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-dark-700">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.title}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${t.status==='done'?'bg-green-500/10 text-green-600':t.status==='in_progress'?'bg-orange-500/10 text-orange-500':'bg-gray-500/10 text-gray-500'}`}>{t.status.replace('_',' ')}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.priority==='high'?'bg-red-500/10 text-red-500':t.priority==='medium'?'bg-yellow-500/10 text-yellow-600':'bg-green-500/10 text-green-600'}`}>{t.priority}</span>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-primary-500 flex-shrink-0">{t.completion_percent||0}%</span>
                            </div>
                          ))}
                        </div>
                    }
                  </>
                )}

                {/* KPI preview */}
                {selectedType === 'kpi' && reportData.kpi_summary && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                      {[
                        { label: 'Total Goals',  val: reportData.kpi_summary.total_goals,   color: 'text-blue-600 bg-blue-500/10' },
                        { label: 'Achieved',     val: reportData.kpi_summary.achieved,      color: 'text-green-600 bg-green-500/10' },
                        { label: 'In Progress',  val: reportData.kpi_summary.in_progress,   color: 'text-orange-500 bg-orange-500/10' },
                        { label: 'KPI Score',    val: `${reportData.kpi_summary.weighted_score}%`, color: 'text-purple-600 bg-purple-500/10' },
                        { label: 'Attendance',   val: `${reportData.kpi_summary.attendance_pct}%`, color: 'text-teal-600 bg-teal-500/10' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                          <p className="text-xl font-bold">{s.val}</p>
                          <p className="text-xs opacity-70">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {reportData.records?.length === 0
                      ? <p className="text-center text-gray-400 py-6">No KPI goals found for this period</p>
                      : <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-dark-700">
                                {['Goal / KPI','Type','Metric','Target','Actual','Completion','Weight'].map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                              {reportData.records?.map((g, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{g.title}</td>
                                  <td className="px-3 py-2 capitalize">{g.type}</td>
                                  <td className="px-3 py-2">{g.kpi_metric||'—'}</td>
                                  <td className="px-3 py-2">{g.target_value||'—'}</td>
                                  <td className="px-3 py-2">{g.actual_value||'—'}</td>
                                  <td className="px-3 py-2"><span className="text-primary-500 font-bold">{g.completion_percent||0}%</span></td>
                                  <td className="px-3 py-2">{g.weightage||0}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                    }
                  </>
                )}

                {/* Performance preview */}
                {selectedType === 'performance' && (
                  <div className="space-y-3">
                    {!reportData.reviews?.length && !reportData.self_assessment
                      ? <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                          <AlertCircle size={16} className="text-yellow-500" />
                          <p className="text-sm text-yellow-700 dark:text-yellow-400">No performance data found for this period.</p>
                        </div>
                      : <>
                          {reportData.reviews?.map((r, i) => (
                            <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
                              <div className="flex items-center gap-3 flex-wrap mb-2">
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{r.cycle}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500">{r.type}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.status==='completed'?'bg-green-500/10 text-green-600':'bg-yellow-500/10 text-yellow-600'}`}>{r.status}</span>
                                <span className="text-2xl font-bold text-primary-500 ml-auto">{r.overall_score||'—'}<span className="text-xs text-gray-400">/100</span></span>
                              </div>
                              {r.manager_comments && <p className="text-xs text-gray-500 italic">{r.manager_comments}</p>}
                            </div>
                          ))}
                          {reportData.self_assessment && (
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">Self Assessment — {reportData.self_assessment.period}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{reportData.self_assessment.achievements || 'No achievements recorded'}</p>
                            </div>
                          )}
                        </>
                    }
                  </div>
                )}

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
