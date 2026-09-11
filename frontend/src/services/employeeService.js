import { api } from './api'

export const employeeService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/employees${q ? '?' + q : ''}`)
    return res.success ? res.data : []
  },

  getMyProfile: async () => {
    const res = await api.get('/employees/my')
    return res.success ? res.data : null
  },

  updateMyProfile: async (data) => {
    const res = await api.put('/employees/my', data)
    return res.success ? res.data : null
  },

  getById: async (id) => {
    const res = await api.get(`/employees/${id}`)
    return res.success ? res.data : null
  },

  getTeam: async () => {
    const res = await api.get('/employees/team')
    return res.success ? res.data : []
  },

  create: async (data) => {
    const res = await api.post('/employees', data)
    return res.success ? res.data : null
  },

  update: async (id, data) => {
    const res = await api.put(`/employees/${id}`, data)
    return res.success ? res.data : null
  },

  uploadAvatar: async (id, file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    const token = localStorage.getItem('epip_token')
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const res = await fetch(`${BASE_URL}/employees/${id}/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    const data = await res.json()
    return data.success ? data.data : { success: false }
  },
}
