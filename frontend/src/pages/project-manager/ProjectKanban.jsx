// ProjectKanban.jsx — Zoho Projects–style Kanban board for PM panel
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, RefreshCw, Calendar, Flag,
  MoreHorizontal, X, User, CheckCircle2, Clock, Circle, Loader2,
  FolderOpen
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Column config (Zoho style) ──────────────────────────────────────────────
const COLUMNS = [
  {
    id:      'todo',
    label:   'To Do',
    color:   '#94a3b8',
    bgLight: 'bg-slate-50 dark:bg-slate-900/30',
    border:  'border-slate-200 dark:border-slate-700',
    icon:    Circle,
  },
  {
    id:      'in_progress',
    label:   'In Progress',
    color:   '#6366f1',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
    border:  'border-indigo-200 dark:border-indigo-700',
    icon:    Loader2,
  },
  {
    id:      'done',
    label:   'Done',
    color:   '#22c55e',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    border:  'border-green-200 dark:border-green-700',
    icon:    CheckCircle2,
  },
]

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'text-red-500',    bg: 'bg-red-500/10'    },
  medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  low:    { label: 'Low',    color: 'text-green-600',  bg: 'bg-green-500/10'  },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null

const daysLeft = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onStatusChange, onSelect }) => {
  const [moving, setMoving] = useState(false)
  const pri   = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const days  = daysLeft(task.due_date)
  const overdue = days !== null && days < 0 && task.status !== 'done'

  const nextStatus = {
    todo:        'in_progress',
    in_progress: 'done',
    done:        null,
  }
  const prevStatus = {
    todo:        null,
    in_progress: 'todo',
    done:        'in_progress',
  }

  const moveCard = async (newStatus) => {
    if (!newStatus || moving) return
    setMoving(true)
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus })
      if (res.success) {
        onStatusChange(task.id, newStatus)
        toast.success(`Moved to ${COLUMNS.find(c => c.id === newStatus)?.label}`)
      } else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
    setMoving(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, shadow: 'lg' }}
      onClick={() => onSelect(task)}
      className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-600 shadow-sm hover:shadow-md cursor-pointer transition-all p-3.5 group"
    >
      {/* Priority + actions row */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pri.bg} ${pri.color}`}>
          <Flag size={9} className="inline mr-1" />{pri.label}
        </span>
        {/* Move buttons */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {prevStatus[task.status] && (
            <button onClick={() => moveCard(prevStatus[task.status])} disabled={moving}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
              ← Back
            </button>
          )}
          {nextStatus[task.status] && (
            <button onClick={() => moveCard(nextStatus[task.status])} disabled={moving}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-600 hover:bg-primary-500 hover:text-white transition-colors font-semibold">
              {moving ? '…' : 'Move →'}
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug mb-2.5 line-clamp-2">
        {task.title}
      </p>

      {/* Description snippet */}
      {task.description && (
        <p className="text-[11px] text-gray-400 mb-2.5 line-clamp-2">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          <Avatar name={task.assigned_to_name || 'Unassigned'} src={task.assigned_to_avatar} size="xs" />
          <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
            {task.assigned_to_name || 'Unassigned'}
          </span>
        </div>

        {/* Due date */}
        {task.due_date && (
          <div className={`flex items-center gap-1 text-[10px] font-medium ${
            overdue ? 'text-red-500' : days !== null && days <= 2 ? 'text-orange-500' : 'text-gray-400'
          }`}>
            <Calendar size={10} />
            {fmtDate(task.due_date)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Task Detail Drawer ─────────────────────────────────────────────────────────
const TaskDrawer = ({ task, onClose, onStatusChange }) => {
  const [status, setStatus] = useState(task.status)
  const [saving, setSaving] = useState(false)
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  const handleStatus = async (newStatus) => {
    setSaving(true)
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus })
      if (res.success) {
        setStatus(newStatus)
        onStatusChange(task.id, newStatus)
        toast.success('Status updated')
      }
    } catch {}
    setSaving(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-md bg-white dark:bg-dark-800 h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Task Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Title */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{task.description}</p>
            )}
          </div>

          {/* Status selector */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
            <div className="flex gap-2 flex-wrap">
              {COLUMNS.map(col => (
                <button key={col.id} onClick={() => handleStatus(col.id)} disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    status === col.id
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-dark-700 border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                  style={status === col.id ? { background: col.color, borderColor: col.color } : {}}
                >
                  <col.icon size={11} />
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pri.bg} ${pri.color}`}>
                {pri.label}
              </span>
            </div>

            {task.due_date && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <Calendar size={13} className="text-gray-400" />
                  {fmtDate(task.due_date)}
                </div>
              </div>
            )}

            {task.assigned_to_name && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assigned To</p>
                <div className="flex items-center gap-2">
                  <Avatar name={task.assigned_to_name} src={task.assigned_to_avatar} size="sm" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{task.assigned_to_name}</span>
                </div>
              </div>
            )}

            {task.assigned_by_name && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assigned By</p>
                <div className="flex items-center gap-2">
                  <Avatar name={task.assigned_by_name} size="sm" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{task.assigned_by_name}</span>
                </div>
              </div>
            )}
          </div>

          {/* Completion */}
          {task.completion_percent > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500 font-medium">Completion</span>
                <span className="font-bold text-primary-500">{task.completion_percent}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                  style={{ width: `${task.completion_percent}%` }} />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Kanban Board ─────────────────────────────────────────────────────────
const ProjectKanban = ({ project, onBack }) => {
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [search,     setSearch]     = useState('')

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      // Try project-specific tasks first, fall back to team tasks filtered by project
      const res = await api.get(`/tasks/by-project/${project.id}`)
      if (res.success) {
        setTasks(res.data || [])
      } else {
        // Fallback: get all team tasks and filter
        const fallback = await api.get('/tasks/team?limit=500')
        if (fallback.success) {
          setTasks((fallback.data || []).filter(t =>
            t.project_id === project.id ||
            t.project_name === (project.name || project.title)
          ))
        }
      }
    } catch { toast.error('Failed to load tasks') }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [project.id])

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (selected?.id === taskId) setSelected(prev => ({ ...prev, status: newStatus }))
  }

  const filtered = tasks.filter(t =>
    !search || (t.title || '').toLowerCase().includes(search.toLowerCase())
  )

  const colTasks = (colId) => filtered.filter(t => t.status === colId)

  const completedCount = tasks.filter(t => t.status === 'done').length
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="h-4 w-px bg-gray-200 dark:bg-dark-600" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={14} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
              {project.name || project.title}
            </h1>
            <p className="text-xs text-gray-400 capitalize">{project.status?.replace('_', ' ') || 'Active'}</p>
          </div>
        </div>

        {/* Search + refresh */}
        <div className="ml-auto flex items-center gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-32 sm:w-44" />
          <button onClick={() => load(true)} disabled={refreshing}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors">
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={14} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{completedCount}/{tasks.length} tasks completed</span>
            <span className="font-bold text-primary-500">{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full" />
          </div>
        </div>
      )}

      {/* Kanban columns — horizontal scroll on mobile, 3-col grid on sm+ */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : (
        <div className="flex sm:grid sm:grid-cols-3 gap-4 overflow-x-auto pb-2 sm:overflow-visible">
          {COLUMNS.map(col => {
            const colItems = colTasks(col.id)
            return (
              <div key={col.id} className="flex flex-col min-h-[400px] min-w-[280px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b-2 ${col.border} ${col.bgLight}`}
                  style={{ borderBottomColor: col.color }}>
                  <div className="flex items-center gap-2">
                    <col.icon size={14} style={{ color: col.color }} />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{col.label}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: col.color }}>
                      {colItems.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className={`flex-1 rounded-b-xl ${col.bgLight} p-2.5 space-y-2.5 min-h-[300px]`}>
                  <AnimatePresence mode="popLayout">
                    {colItems.length === 0 ? (
                      <motion.div key="empty"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-10 text-center">
                        <col.icon size={24} style={{ color: col.color, opacity: 0.3 }} className="mb-2" />
                        <p className="text-xs text-gray-400">No tasks</p>
                      </motion.div>
                    ) : (
                      colItems.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onStatusChange={handleStatusChange}
                          onSelect={setSelected}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Task detail drawer */}
      <AnimatePresence>
        {selected && (
          <TaskDrawer
            task={selected}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectKanban
