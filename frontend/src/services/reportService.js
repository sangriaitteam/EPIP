import { api } from './api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Helper: download a blob from an authenticated endpoint ────────────────
const downloadBlob = async (url, filename) => {
  const token = localStorage.getItem('epip_token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objUrl)
}

export const reportService = {
  // ── JSON report data (for preview) ───────────────────────────────────────
  getAttendance: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/reports/attendance${q ? '?' + q : ''}`)
    return res.success ? res.data : { records: [], total: 0 }
  },

  getPerformance: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/reports/performance${q ? '?' + q : ''}`)
    return res.success ? res.data : { records: [], total: 0 }
  },

  getTasks: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/reports/tasks${q ? '?' + q : ''}`)
    return res.success ? res.data : { records: [], total: 0 }
  },

  getSummary: async () => {
    const res = await api.get('/reports/summary')
    return res.success ? res.data : {}
  },

  // ── Per-employee report JSON ──────────────────────────────────────────────
  getEmployeeReport: async (employeeId, type, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/reports/employee/${employeeId}/${type}${q ? '?' + q : ''}`)
    return res.success ? res.data : null
  },

  // ── Excel download (real file from backend) ───────────────────────────────
  exportExcel: async (employeeId, type, year, month) => {
    const url = `${BASE_URL}/reports/employee/${employeeId}/${type}?year=${year}&month=${month}&format=excel`
    const filename = `${type}_report_${year}_${String(month).padStart(2,'0')}.xlsx`
    await downloadBlob(url, filename)
  },

  // ── Company-wide attendance Excel ─────────────────────────────────────────
  exportAttendanceExcel: async (from, to, department_id) => {
    const params = new URLSearchParams({ from, to, format: 'excel' })
    if (department_id) params.append('department_id', department_id)
    const url = `${BASE_URL}/reports/attendance?${params}`
    await downloadBlob(url, `attendance_${from}_${to}.xlsx`)
  },

  // ── Company summary ───────────────────────────────────────────────────────
  getCompanySummary: async () => {
    const res = await api.get('/reports/summary')
    return res.success ? res.data : null
  },
}
