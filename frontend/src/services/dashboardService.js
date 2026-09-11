import { api } from './api'

export const dashboardService = {
  getEmployee: async () => {
    const res = await api.get('/dashboard/employee')
    return res.success ? res.data : null
  },

  getManager: async () => {
    const res = await api.get('/dashboard/manager')
    return res.success ? res.data : null
  },

  getHR: async () => {
    const res = await api.get('/dashboard/hr')
    return res.success ? res.data : null
  },
}
