import { api } from './api'

export const goalService = {
  getMy: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/goals/my${q ? '?' + q : ''}`)
    return res.success ? res.data : []
  },

  getByEmployee: async (id, params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/goals/employee/${id}${q ? '?' + q : ''}`)
    return res.success ? res.data : []
  },

  getByDepartment: async (id) => {
    const res = await api.get(`/goals/department/${id}`)
    return res.success ? res.data : []
  },

  getById: async (id) => {
    const res = await api.get(`/goals/${id}`)
    return res.success ? res.data : null
  },

  create: async (data) => {
    const res = await api.post('/goals', data)
    return res.success ? res.data : null
  },

  update: async (id, data) => {
    const res = await api.put(`/goals/${id}`, data)
    return res.success ? res.data : null
  },

  approve: async (id) => {
    const res = await api.patch(`/goals/${id}/approve`, {})
    return res.success ? res.data : null
  },

  uploadEvidence: async (goalId, file) => {
    const formData = new FormData()
    formData.append('evidence', file)
    const token = localStorage.getItem('epip_token')
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const res = await fetch(`${BASE_URL}/goals/${goalId}/evidence`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json()
    return data.success ? data.data : null
  },

  delete: async (id) => {
    const res = await api.delete(`/goals/${id}`)
    return res.success
  },
}
