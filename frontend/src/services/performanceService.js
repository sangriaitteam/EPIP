import { api } from './api'
import { mockPerformanceReviews } from '../utils/mockData'

export const performanceService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/performance${q ? '?' + q : ''}`)
    return res.success ? res.data : mockPerformanceReviews
  },

  getMy: async () => {
    const res = await api.get('/performance/my')
    return res.success ? res.data : mockPerformanceReviews
  },

  getByEmployee: async (id) => {
    const res = await api.get(`/performance/employee/${id}`)
    return res.success ? res.data : mockPerformanceReviews.filter(r => r.employeeId === id)
  },

  getById: async (id) => {
    const res = await api.get(`/performance/${id}`)
    return res.success ? res.data : mockPerformanceReviews.find(r => r.id === id) || null
  },

  create: async (data) => {
    const res = await api.post('/performance', data)
    return res.success ? res.data : { ...data, id: Date.now() }
  },

  submitReview: async (id, data) => {
    const res = await api.put(`/performance/${id}/submit`, data)
    return res.success ? res.data : { id, status: 'completed' }
  },

  hrApprove: async (id, hrComments = '') => {
    const res = await api.patch(`/performance/${id}/hr-approve`, { hr_comments: hrComments })
    return res.success ? res.data : { id, status: 'approved' }
  },

  getDefaultParams: async () => {
    const res = await api.get('/performance/params/default')
    return res.success ? res.data : []
  },
}
