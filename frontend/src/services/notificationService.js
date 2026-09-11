import { api } from './api'
import { mockNotifications } from '../utils/mockData'

export const notificationService = {
  getAll: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/notifications${q ? '?' + q : ''}`)
    return res.success ? res.data : { notifications: mockNotifications, unread_count: mockNotifications.filter(n => !n.isRead).length }
  },

  getCount: async () => {
    const res = await api.get('/notifications/count')
    return res.success ? res.data.unread_count : 0
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
