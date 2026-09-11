import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare, Clock, Calendar, Flag, Search,
  CheckCircle, Circle, Timer, Star, FolderOpen
} from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import ProgressBar from '../../components/common/ProgressBar'
import { api } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'todo',        label: 'To Do',      color: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { value: 'review',      label: 'In Review',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
  { value: 'done',        label: 'Done',        color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
]

const PRIORITY_COLOR = {
  low:    'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
}

const fadeUp = { hidden: { opacity:0, y:18 }, show: { opacity:1, y:0, transition: { type:'spring', stiffness:120, damping:14 } } }

// ── Task Card ──────────────────────────────────────────────────────────────
const TaskCard = ({ task, onStatusChange, updating, fromSuperAdmin }) => {
  const [showMenu, setShowMenu] = useState(false)
  const statusInfo = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0]
  const isOverdue  = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <motion.div layout initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      className={`rounded-2xl border shadow-sm p-4 sm:p-5 ${
        fromSuperAdmin
          ? 'bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-500/5 dark:to-dark-800 border-yellow-200 dark:border-yellow-500/20'
          : 'bg-white dark:bg-dark-800 border-gray-100 dark:border-dark-600'
      }`}>

      {/* Superadmin badge */}
      {fromSuperAdmin && (
        <div className="flex items-center gap-1.5 mb-2">
          <Star size={12} className="text-yellow-500" />
          <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">From Super Admin</span>
          {task.project_name && (
            <span className="flex items-center gap-1 text-xs text-yellow-600/70 dark:text-yellow-400/70">
              <FolderOpen size={10} /> {task.project_name}
            </span>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Status icon */}
        <button onClick={() => setShowMenu(s => !s)} className="mt-0.5 flex-shrink-0" title="Change status">
          {task.status === 'done'
            ? <CheckCircle size={20} className="text-green-500" />
            : task.status === 'in_progress'
            ? <Timer size={20} className="text-blue-500" />
            : <Circle size={20} className="text-gray-400 hover:text-primary-500 transition-colors" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold text-sm leading-tight ${
              task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
            }`}>{task.title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className={`px-2 py-0.5 rounded-full font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                <Calendar size={11} />
                {isOverdue ? 'Overdue: ' : 'Due: '}{formatDate(task.due_date)}
              </span>
            )}
          </div>

          <div className="mt-3">
            <ProgressBar value={task.completion_percent || 0} size="sm" showPercent={false} />
          </div>
        </div>
      </div>

      {/* Status menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity:0, y:-8, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-8, scale:0.95 }} transition={{ duration:0.15 }}
            className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-600"
          >
            <p className="text-xs text-gray-400 mb-2 font-medium">Update status:</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  disabled={updating === task.id || task.status === opt.value}
                  onClick={async () => {
                    setShowMenu(false)
                    await onStatusChange(task.id, opt.value)
                  }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                    task.status === opt.value
                      ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:border-primary-300'
                  } disabled:opacity-50`}>
                  {updating === task.id ? '…' : opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, count, color }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={16} />
    </div>
    <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h2>
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300">
      {count}
    </span>
  </div>
)

// ── Main Page ──────────────────────────────────────────────────────────────
const EmployeeTasks = () => {
  const [tasks,    setTasks]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await api.get('/tasks/my')
        if (res.success) setTasks(res.data || [])
        else setTasks([])
      } catch { setTasks([]) }
      setLoading(false)
    }
    load()
  }, [])

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdating(taskId)
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus })
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
        toast.success(`Status → "${newStatus.replace('_', ' ')}"`)
      } else toast.error(res.message || 'Failed to update')
    } catch { toast.error('Cannot connect to server') }
    setUpdating(null)
  }

  // Split into superadmin vs regular
  const superadminTasks = tasks.filter(t => t.source === 'superadmin')
  const regularTasks    = tasks.filter(t => t.source !== 'superadmin')

  // Stats
  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const overdue    = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length

  const applyFilter = (list) => list.filter(t => {
    const matchFilter =
      filter === 'all'         ? true :
      filter === 'superadmin'  ? t.source === 'superadmin' :
      filter === 'pending'     ? t.status !== 'done' :
      filter === 'overdue'     ? (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done') :
      t.status === filter
    const matchSearch = (t.title||'').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const filteredSuper   = applyFilter(superadminTasks)
  const filteredRegular = applyFilter(regularTasks)

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Click the status icon on any task to update your progress
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="show"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Tasks"      value={total}             icon={CheckSquare} color="primary" delay={0.1} />
        <StatCard title="In Progress"      value={inProgress}        icon={Timer}       color="blue"    delay={0.2} />
        <StatCard title="Completed"        value={done}              icon={CheckCircle} color="green"   delay={0.3} />
        <StatCard title="From SuperAdmin"  value={superadminTasks.length} icon={Star}  color="yellow"  delay={0.4} />
      </motion.div>

      {/* Search + Filter */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto scrollbar-hide">
          {[
            { key:'all',        label:`All (${total})` },
            { key:'superadmin', label:`From SuperAdmin (${superadminTasks.length})`, star:true },
            { key:'pending',    label:`Pending (${total-done})` },
            { key:'in_progress',label:`In Progress (${inProgress})` },
            { key:'done',       label:`Done (${done})` },
            { key:'overdue',    label:`Overdue (${overdue})`, warn:overdue>0 },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
                filter === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : tab.warn
                  ? 'border-transparent text-red-500'
                  : tab.star
                  ? 'border-transparent text-yellow-600 dark:text-yellow-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}>
              {tab.star && <Star size={11} />}
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : (tasks.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <CheckSquare size={36} className="text-gray-300 dark:text-dark-500 mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">No tasks assigned yet</p>
          <p className="text-sm text-gray-400 mt-1">Your manager will assign tasks to you</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── SuperAdmin Tasks ── */}
          {filteredSuper.length > 0 && (
            <div>
              <SectionHeader icon={Star} title="From Super Admin" count={filteredSuper.length}
                color="bg-yellow-500/10 text-yellow-500" />
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredSuper.map(task => (
                    <TaskCard key={task.id} task={task} fromSuperAdmin={true}
                      onStatusChange={handleStatusChange} updating={updating} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* ── Regular Tasks ── */}
          {filteredRegular.length > 0 && (
            <div>
              {filteredSuper.length > 0 && (
                <SectionHeader icon={CheckSquare} title="Other Assigned Tasks" count={filteredRegular.length}
                  color="bg-primary-500/10 text-primary-500" />
              )}
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRegular.map(task => (
                    <TaskCard key={task.id} task={task} fromSuperAdmin={false}
                      onStatusChange={handleStatusChange} updating={updating} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* No results for current filter */}
          {filteredSuper.length === 0 && filteredRegular.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p>No tasks match your current filter</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EmployeeTasks
