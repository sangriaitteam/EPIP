import { api } from './api'
import { mockTasks } from '../utils/mockData'

export const taskService = {
  getMy: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/tasks/my${q ? '?' + q : ''}`)
    return res.success ? res.data : mockTasks
  },

  getTeam: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/tasks/team${q ? '?' + q : ''}`)
    return res.success ? res.data : mockTasks
  },

  getById: async (id) => {
    const res = await api.get(`/tasks/${id}`)
    return res.success ? res.data : mockTasks.find(t => t.id === id) || null
  },

  create: async (data) => {
    const res = await api.post('/tasks', data)
    return res.success ? res.data : { ...data, id: Date.now() }
  },

  update: async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data)
    return res.success ? res.data : { id, ...data }
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/tasks/${id}/status`, { status })
    return res.success ? res.data : { id, status }
  },

  delete: async (id) => {
    const res = await api.delete(`/tasks/${id}`)
    return res.success ? res.data : { success: true }
  },

  addComment: async (taskId, content) => {
    const res = await api.post(`/tasks/${taskId}/comments`, { content })
    return res.success ? res.data : { content, createdAt: new Date().toISOString() }
  },

  getComments: async (taskId) => {
    const res = await api.get(`/tasks/${taskId}/comments`)
    return res.success ? res.data : []
  },
}
