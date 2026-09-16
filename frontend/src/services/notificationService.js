import { api } from './api'

export const notificationService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/notifications${q ? '?' + q : ''}`)
    if (!res.success) throw new Error(res.message || 'Failed to fetch notifications')
    return res.data
  },

  getCount: async () => {
    const res = await api.get('/notifications/count')
    if (!res.success) return 0
    return res.data.unread_count
  },

  markRead: async (id) => {
    const res = await api.patch(`/notifications/${id}/read`, {})
    return res.success
  },

  markAllRead: async () => {
    const res = await api.patch('/notifications/read-all', {})
    return res.success
  },
}
