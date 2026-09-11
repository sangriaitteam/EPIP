import { api } from './api'

export const attendanceService = {
  checkIn: async (data) => {
    const res = await api.post('/attendance/check-in', data)
    return res.success ? res.data : null
  },

  checkOut: async () => {
    const res = await api.post('/attendance/check-out', {})
    return res.success ? res.data : null
  },

  getToday: async () => {
    const res = await api.get('/attendance/today')
    return res.success ? res.data : null
  },

  getMy: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/attendance/my${q ? '?' + q : ''}`)
    return res.success ? res.data : []
  },

  getSummary: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/attendance/summary${q ? '?' + q : ''}`)
    return res.success ? res.data : null
  },

  getWeekly: async (year, month) => {
    const res = await api.get(`/attendance/weekly?year=${year}&month=${month}`)
    return res.success ? res.data : []
  },

  getByEmployee: async (employeeId, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/attendance/employee/${employeeId}${q ? '?' + q : ''}`)
    return res.success ? res.data : []
  },

  getSummaryByEmployee: async (employeeId, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/attendance/employee/${employeeId}/summary${q ? '?' + q : ''}`)
    return res.success ? res.data : null
  },
}
