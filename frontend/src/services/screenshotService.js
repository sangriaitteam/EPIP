import { api } from './api'
import { mockScreenshots } from '../utils/mockData'

export const screenshotService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/screenshots${q ? '?' + q : ''}`)
    return res.success ? res.data : mockScreenshots
  },

  getByEmployee: async (id, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/screenshots/employee/${id}${q ? '?' + q : ''}`)
    return res.success ? res.data : mockScreenshots.filter(s => s.employeeId === id)
  },

  countToday: async (employeeId) => {
    const res = await api.get(`/screenshots/count/today/${employeeId}`)
    return res.success ? res.data.count : 0
  },
}
