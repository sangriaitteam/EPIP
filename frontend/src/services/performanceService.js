import { api } from './api'

export const performanceService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/performance${q ? '?' + q : ''}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch performance reviews')
    return res.data
  },

  getMy: async () => {
    const res = await api.get('/performance/my')
    if (!res.success) throw new Error(res.message || 'Failed to fetch your performance reviews')
    return res.data
  },

  getByEmployee: async (id) => {
    const res = await api.get(`/performance/employee/${id}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch employee performance reviews')
    return res.data
  },

  getById: async (id) => {
    const res = await api.get(`/performance/${id}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch performance review')
    return res.data
  },

  create: async (data) => {
    const res = await api.post('/performance', data)
    if (!res.success) throw new Error(res.message || 'Failed to create performance review')
    return res.data
  },

  submitReview: async (id, data) => {
    const res = await api.put(`/performance/${id}/submit`, data)
    if (!res.success) throw new Error(res.message || 'Failed to submit performance review')
    return res.data
  },

  hrApprove: async (id, hrComments = '') => {
    const res = await api.patch(`/performance/${id}/hr-approve`, { hr_comments: hrComments })
    if (!res.success) throw new Error(res.message || 'Failed to approve performance review')
    return res.data
  },

  getDefaultParams: async () => {
    const res = await api.get('/performance/params/default')
    if (!res.success) throw new Error(res.message || 'Failed to fetch default parameters')
    return res.data
  },
}
