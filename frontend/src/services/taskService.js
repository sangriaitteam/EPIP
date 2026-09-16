import { api } from './api'

export const taskService = {
  getMy: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/tasks/my${q ? '?' + q : ''}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch your tasks')
    return res.data
  },

  getTeam: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/tasks/team${q ? '?' + q : ''}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch team tasks')
    return res.data
  },

  getById: async (id) => {
    const res = await api.get(`/tasks/${id}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch task')
    return res.data
  },

  create: async (data) => {
    const res = await api.post('/tasks', data)
    if (!res.success) throw new Error(res.message || 'Failed to create task')
    return res.data
  },

  update: async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data)
    if (!res.success) throw new Error(res.message || 'Failed to update task')
    return res.data
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/tasks/${id}/status`, { status })
    if (!res.success) throw new Error(res.message || 'Failed to update task status')
    return res.data
  },

  delete: async (id) => {
    const res = await api.delete(`/tasks/${id}`)
    if (!res.success) throw new Error(res.message || 'Failed to delete task')
    return res.data
  },

  addComment: async (taskId, content) => {
    const res = await api.post(`/tasks/${taskId}/comments`, { content })
    if (!res.success) throw new Error(res.message || 'Failed to add comment')
    return res.data
  },

  getComments: async (taskId) => {
    const res = await api.get(`/tasks/${taskId}/comments`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch comments')
    return res.data
  },
}
