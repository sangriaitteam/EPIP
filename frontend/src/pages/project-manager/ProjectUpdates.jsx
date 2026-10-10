import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '—'

const daysLeft = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

const PRIORITY_STYLE = {
  low:    'bg-gray-400 text-white',
  medium: 'bg-yellow-400 text-white',
  high:   'bg-orange-400 text-white',
  urgent: 'bg-red-500 text-white',
}

const PMProjectUpdates = () => {
  const [data,       setData]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [deleting,   setDeleting]   = useState(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/tasks/team-updates')
      if (res.success) setData(res.data || [])
      else setData([])
    } catch { setData([]) }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = async (taskId, taskTitle) => {
    if (!window.confirm(`Delete "${taskTitle}"? This cannot be undone.`)) return
    setDeleting(taskId)
    try {
      const res = await api.delete(`/tasks/${taskId}`)
      if (res.success) {
        toast.success('Task deleted')
        setData(prev => prev.map(emp => ({
          ...emp,
          tasks: (emp.tasks || []).filter(t => t.id !== taskId),
          total_tasks: Math.max(0, (emp.total_tasks || 0) - 1),
        })))
      } else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect') }
    setDeleting(null)
  }

  // Flatten all tasks
  const allTasks = data.flatMap(emp =>
    (emp.tasks || []).map(t => ({ ...t, employee_name: emp.employee_name }))
  )

  const filtered = allTasks.filter(t =>
    !search ||
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase()) ||
    t.employee_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Task Updates</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time task tracking · Auto-refreshes every 30s
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
          <motion.div animate={refreshing ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={13} />
          </motion.div>
          Refresh
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">

        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-dark-600">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {search ? 'No tasks match your search' : 'No tasks yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 860 }}>
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Assigned Date</th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Task Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Completion</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Due Date</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {filtered.map((t, i) => {
                  const days      = daysLeft(t.due_date)
                  const isOverdue = days !== null && days < 0 && t.status !== 'done'
                  const pct       = t.completion_percent || 0

                  return (
                    <motion.tr key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.4) }}
                      className="hover:bg-gray-50 dark:hover:bg-dark-700/40 transition-colors"
                    >
                      {/* Assigned Date */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {fmtDate(t.created_at)}
                        </p>
                      </td>

                      {/* Task Name */}
                      <td className="px-5 py-4">
                        <p className={`font-semibold leading-tight ${
                          t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'
                        }`}>{t.title}</p>
                        {t.employee_name && (
                          <p className="text-[10px] text-gray-400 mt-0.5">👤 {t.employee_name}</p>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 max-w-[200px]">
                          {t.description || <span className="italic text-gray-300 dark:text-dark-500">No description</span>}
                        </p>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize ${
                          PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium
                        }`}>
                          {t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : 'Medium'}
                        </span>
                      </td>

                      {/* Completion */}
                      <td className="px-4 py-4 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, delay: i * 0.03 }}
                              className={`h-full rounded-full ${
                                pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 text-right flex-shrink-0">
                            {pct}%
                          </span>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-4">
                        <p className={`text-sm font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                          {fmtDate(t.due_date)}
                        </p>
                        {days !== null && t.status !== 'done' && t.due_date && (
                          <p className={`text-[11px] mt-0.5 ${isOverdue ? 'text-red-400' : days === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>
                            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                          </p>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleDelete(t.id, t.title)}
                          disabled={deleting === t.id}
                          className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          title="Delete task"
                        >
                          {deleting === t.id
                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full" />
                            : <Trash2 size={15} />
                          }
                        </button>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-dark-600 text-xs text-gray-400">
            {filtered.length} task{filtered.length !== 1 ? 's' : ''} total
          </div>
        )}
      </div>
    </div>
  )
}

export default PMProjectUpdates
