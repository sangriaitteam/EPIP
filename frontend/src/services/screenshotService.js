import { api } from './api'

export const screenshotService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/screenshots${q ? '?' + q : ''}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch screenshots')
    return res.data
  },

  getByEmployee: async (id, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/screenshots/employee/${id}${q ? '?' + q : ''}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch employee screenshots')
    return res.data
  },

  countToday: async (employeeId) => {
    const res = await api.get(`/screenshots/count/today/${employeeId}`)
    if (!res.success) return 0
    return res.data.count
  },
}
