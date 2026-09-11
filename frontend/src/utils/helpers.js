import { clsx } from 'clsx'

export const cn = (...inputs) => clsx(inputs)

export const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatTime = (timeString) => {
  if (!timeString) return '—'
  return timeString
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const getStatusColor = (status) => {
  const map = {
    active:      'text-green-500 bg-green-500/10',
    inactive:    'text-red-500 bg-red-500/10',
    present:     'text-green-500 bg-green-500/10',
    absent:      'text-red-500 bg-red-500/10',
    leave:       'text-yellow-500 bg-yellow-500/10',
    late:        'text-orange-500 bg-orange-500/10',
    todo:        'text-gray-500 bg-gray-500/10',
    in_progress: 'text-blue-500 bg-blue-500/10',
    review:      'text-purple-500 bg-purple-500/10',
    done:        'text-green-500 bg-green-500/10',
    pending:     'text-yellow-500 bg-yellow-500/10',
    approved:    'text-green-500 bg-green-500/10',
    rejected:    'text-red-500 bg-red-500/10',
    completed:   'text-green-500 bg-green-500/10',
    not_started: 'text-gray-500 bg-gray-500/10',
    submitted:   'text-blue-500 bg-blue-500/10',
  }
  return map[status] || 'text-gray-500 bg-gray-500/10'
}

export const getPriorityColor = (priority) => {
  const map = {
    urgent: 'text-red-500 bg-red-500/10 border-red-500/30',
    high:   'text-orange-500 bg-orange-500/10 border-orange-500/30',
    medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    low:    'text-green-500 bg-green-500/10 border-green-500/30',
  }
  return map[priority] || 'text-gray-500 bg-gray-500/10 border-gray-500/30'
}

export const getScoreColor = (score) => {
  if (score >= 85) return 'text-green-500'
  if (score >= 70) return 'text-yellow-500'
  if (score >= 50) return 'text-orange-500'
  return 'text-red-500'
}

export const getProgressColor = (percent) => {
  if (percent >= 80) return 'bg-green-500'
  if (percent >= 60) return 'bg-yellow-500'
  if (percent >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

export const truncate = (str, length = 50) => {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '...' : str
}

export const daysUntil = (dateString) => {
  const diff = new Date(dateString) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
