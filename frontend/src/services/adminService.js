import { api } from './api'

export const adminService = {
  // Departments
  getDepartments:    ()        => api.get('/admin/departments').then(r => r.success ? r.data : []),
  createDepartment:  (data)    => api.post('/admin/departments', data).then(r => r.success ? r.data : null),
  updateDepartment:  (id, d)   => api.put(`/admin/departments/${id}`, d).then(r => r.success ? r.data : null),
  deleteDepartment:  (id)      => api.delete(`/admin/departments/${id}`).then(r => r.success),

  // Users
  getUsers:          (p = {})  => api.get(`/admin/users${Object.keys(p).length ? '?' + new URLSearchParams(p) : ''}`).then(r => r.success ? r.data : []),
  updateUser:        (id, d)   => api.put(`/admin/users/${id}`, d).then(r => r.success ? r.data : null),
  deactivateUser:    (id)      => api.patch(`/admin/users/${id}/deactivate`, {}).then(r => r.success),

  // Settings
  getSettings:       ()        => api.get('/admin/settings').then(r => r.success ? r.data : {}),
  updateSettings:    (data)    => api.put('/admin/settings', data).then(r => r.success),

  // Holidays
  getHolidays:       ()        => api.get('/admin/holidays').then(r => r.success ? r.data : []),
  createHoliday:     (data)    => api.post('/admin/holidays', data).then(r => r.success ? r.data : null),
  deleteHoliday:     (id)      => api.delete(`/admin/holidays/${id}`).then(r => r.success),

  // Shifts
  getShifts:         ()        => api.get('/admin/shifts').then(r => r.success ? r.data : []),
  createShift:       (data)    => api.post('/admin/shifts', data).then(r => r.success ? r.data : null),

  // Audit logs
  getAuditLogs:      (limit)   => api.get(`/admin/audit-logs${limit ? '?limit=' + limit : ''}`).then(r => r.success ? r.data : []),
}
