// ProjectDetail.jsx — Full project detail page (Overview / Tasks / Team / Reports)
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, FolderOpen, Users, Calendar, Flag, CheckCircle2,
  Circle, Loader2, Clock, MoreHorizontal, RefreshCw, Search, Plus, X,
  BarChart2, ListTodo, UserCheck, FileBarChart, AlertCircle,
  TrendingUp, Briefcase, Download
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const fmtDateLong = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const statusBadge = (s) => {
  const map = {
    planning:    'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    in_progress: 'bg-green-500/20 text-green-400 border border-green-500/30',
    review:      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    completed:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    on_hold:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    cancelled:   'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return map[s] || map.planning
}
const statusLabel = (s) => ({
  planning: 'Planning', in_progress: 'Active', review: 'Review',
  completed: 'Completed', on_hold: 'On Hold', cancelled: 'Cancelled',
}[s] || s)

const priorityColor = (p) => ({
  low: 'text-green-400', medium: 'text-yellow-400',
  high: 'text-orange-400', urgent: 'text-red-500',
}[p] || 'text-gray-400')

const taskStatusIcon = (s) => {
  if (s === 'done')        return <CheckCircle2 size={13} className="text-green-500" />
  if (s === 'in_progress') return <Loader2     size={13} className="text-indigo-400" />
  if (s === 'review')      return <Clock       size={13} className="text-yellow-400" />
  return <Circle size={13} className="text-gray-400" />
}

const taskStatusLabel = (s) => ({
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
}[s] || s)

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, iconBg, label, value, sub }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
)

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ project, tasks, memberStats }) => {
  const done    = tasks.filter(t => t.status === 'done').length
  const total   = tasks.length
  const pending = tasks.filter(t => t.status !== 'done').length

  // Group by status for mini chart
  const byStatus = {
    todo:        tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review:      tasks.filter(t => t.status === 'review').length,
    done,
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListTodo}  iconBg="bg-indigo-500"  label="Total Tasks"     value={total}                          sub={`${done} completed · ${pending} pending`} />
        <StatCard icon={TrendingUp} iconBg="bg-primary-500" label="Project Progress" value={(project.completion_percent || 0) + '%'} sub="Overall completion" />
        <StatCard icon={Users}     iconBg="bg-purple-500"  label="Total Members"   value={memberStats.length}            sub="Active team members" />
        <StatCard icon={Calendar}  iconBg="bg-amber-500"   label="Start Date"      value={fmtDateLong(project.start_date)} sub={'End: ' + fmtDateLong(project.deadline || project.end_date)} />
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</p>
          <span className="text-sm font-bold text-primary-500">{project.completion_percent || 0}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: (project.completion_percent || 0) + '%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
          />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'To Do',       count: byStatus.todo,        color: 'bg-gray-400' },
            { label: 'In Progress', count: byStatus.in_progress, color: 'bg-indigo-500' },
            { label: 'Review',      count: byStatus.review,      color: 'bg-yellow-400' },
            { label: 'Done',        count: byStatus.done,        color: 'bg-green-500' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`w-2.5 h-2.5 rounded-full ${s.color} mx-auto mb-1`} />
              <p className="text-[10px] text-gray-400">{s.label}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{s.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Related / project info */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Briefcase size={14} className="text-primary-500" /> Project Info
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Client',          value: project.client || '—' },
              { label: 'Project Manager', value: project.project_manager || project.created_by_name || '—' },
              { label: 'Priority',        value: <span className={priorityColor(project.priority) + ' font-semibold capitalize'}>{project.priority || '—'}</span> },
              { label: 'Start Date',      value: fmtDate(project.start_date) },
              { label: 'End Date',        value: fmtDate(project.deadline || project.end_date) },
              { label: 'Status',          value: <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + statusBadge(project.status)}>{statusLabel(project.status)}</span> },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-gray-50 dark:border-dark-700 last:border-0">
                <span className="text-xs text-gray-400">{row.label}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee progress */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <UserCheck size={14} className="text-primary-500" /> Employee Progress
          </h3>
          {memberStats.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No team members yet</p>
          ) : (
            <div className="space-y-2.5">
              {memberStats.map(m => {
                const name = (m.first_name + ' ' + m.last_name).trim()
                const pct  = m.total_tasks > 0 ? Math.round((m.done_tasks / m.total_tasks) * 100) : 0
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <Avatar name={name} src={m.avatar_url} size="sm" animate={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-gray-400">{m.done_tasks}/{m.total_tasks}</span>
                          <span className="text-[10px] font-bold text-primary-500">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: pct + '%' }}
                          transition={{ duration: 0.7 }}
                          className="h-full rounded-full"
                          style={{ background: pct === 100 ? '#22c55e' : pct > 50 ? '#6366f1' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-500 flex-shrink-0 capitalize">{m.role}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tasks Tab — Full Kanban + Sidebar ────────────────────────────────────────
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/15' },
  high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/15' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
  low:    { label: 'Low',    color: 'text-green-400',  bg: 'bg-green-500/15' },
}

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#94a3b8', dot: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: '#6366f1', dot: 'bg-indigo-500' },
  { id: 'review',      label: 'Review',      color: '#eab308', dot: 'bg-yellow-400' },
  { id: 'done',        label: 'Completed',   color: '#22c55e', dot: 'bg-green-500' },
]

const MiniDonut = ({ pct, color, size = 48 }) => {
  const r = (size / 2) - 5
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{pct}%</text>
    </svg>
  )
}

const AddTaskModal = ({ projectId, column, employees, onClose, onCreated }) => {
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '', priority: 'medium',
    due_date: '', status: column,
  })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const iCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-600 bg-dark-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.assigned_to)  { toast.error('Assign to someone'); return }
    setSaving(true)
    try {
      const res = await api.post('/tasks', {
        title:       form.title.trim(),
        description: form.description || null,
        assigned_to: parseInt(form.assigned_to),
        priority:    form.priority,
        due_date:    form.due_date || null,
        status:      form.status,
        project_id:  projectId,
        source:      'project_manager',
      })
      if (res.success) { toast.success('Task created!'); onCreated(res.data); onClose() }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-dark-800 rounded-2xl shadow-2xl border border-dark-600 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-600">
          <h3 className="font-bold text-white text-sm">Add Task — {COLUMNS.find(c => c.id === column)?.label}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Title *</label>
            <input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="Task title..." className={iCls} autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Description</label>
            <textarea value={form.description} onChange={e => setF('description', e.target.value)}
              placeholder="Brief description..." rows={2} className={iCls + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Assign To *</label>
              <select value={form.assigned_to} onChange={e => setF('assigned_to', e.target.value)} className={iCls}>
                <option value="">Select member</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{(e.first_name || '') + ' ' + (e.last_name || '')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setF('priority', e.target.value)} className={iCls}>
                {['low','medium','high','urgent'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Due Date</label>
            <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)} className={iCls} />
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-xl border border-dark-600 text-gray-400 hover:bg-dark-700">Cancel</button>
          <motion.button onClick={handleSave} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex-1 py-2 text-sm font-semibold rounded-xl bg-primary-500 text-white disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Task'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

const TaskCard = ({ task, onStatusChange, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moving, setMoving]     = useState(false)
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  const nextCol = { todo: 'in_progress', in_progress: 'review', review: 'done', done: null }

  const moveTask = async (newStatus) => {
    if (!newStatus || moving) return
    setMoving(true)
    setMenuOpen(false)
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus })
      if (res.success) { onStatusChange(task.id, newStatus); toast.success('Moved') }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
    setMoving(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    setMenuOpen(false)
    try {
      const res = await api.delete(`/tasks/${task.id}`)
      if (res.success) { onDelete(task.id); toast.success('Deleted') }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
  }

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-dark-700 rounded-xl border border-dark-600 p-3 hover:border-primary-500/40 transition-colors relative group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.status === 'done'
            ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
            : <Circle size={13} className="text-gray-500 flex-shrink-0" />
          }
        </div>
        <p className="flex-1 text-xs font-semibold text-gray-200 leading-snug">{task.title}</p>
        <div className="relative flex-shrink-0">
          <button onClick={() => setMenuOpen(v => !v)}
            className="p-0.5 rounded text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal size={13} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-6 z-20 w-36 bg-dark-800 rounded-xl shadow-xl border border-dark-600 overflow-hidden">
                {nextCol[task.status] && (
                  <button onClick={() => moveTask(nextCol[task.status])}
                    className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-primary-500/10 hover:text-primary-400">
                    → Move to {COLUMNS.find(c => c.id === nextCol[task.status])?.label}
                  </button>
                )}
                {['todo','in_progress','review','done'].filter(s => s !== task.status).map(s => (
                  <button key={s} onClick={() => moveTask(s)}
                    className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-primary-500/10 hover:text-primary-400">
                    → {COLUMNS.find(c => c.id === s)?.label}
                  </button>
                ))}
                <div className="border-t border-dark-600" />
                <button onClick={handleDelete}
                  className="w-full px-3 py-2 text-xs text-left text-red-400 hover:bg-red-500/10">
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-[10px] text-gray-400 mb-2 line-clamp-2 ml-5">{task.description}</p>
      )}

      {/* Priority badge */}
      <div className="flex items-center gap-1.5 mb-2 ml-5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pri.bg} ${pri.color}`}>
          {pri.label}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between ml-5">
        <span className={`text-[10px] flex items-center gap-1 ` + (isOverdue ? 'text-red-400 font-semibold' : 'text-gray-500')}>
          <Calendar size={9} />
          {task.due_date ? fmtDate(task.due_date) : 'No due date'}
        </span>
        {task.assignee_name && (
          <Avatar name={task.assignee_name} src={task.assignee_avatar} size="xs" animate={false} />
        )}
      </div>

      {moving && (
        <div className="absolute inset-0 bg-dark-800/80 rounded-xl flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      )}
    </motion.div>
  )
}

const TasksTab = ({ tasks: initialTasks, projectId, project, memberStats, onRefresh }) => {
  const [tasks, setTasks]           = useState(initialTasks)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [addTaskCol, setAddTaskCol] = useState(null)   // column id to add task in

  // Sync when parent data refreshes
  useEffect(() => { setTasks(initialTasks) }, [initialTasks])

  // Build employee list from memberStats for the add task modal
  const employees = memberStats.map(m => ({
    id: m.id, first_name: m.first_name, last_name: m.last_name,
  }))

  // Filter tasks
  const filtered = tasks.filter(t => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  // Per-column tasks
  const byCol = (colId) => filtered.filter(t => t.status === colId)

  // Stats
  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const pending    = tasks.filter(t => t.status === 'todo').length
  const donePct    = total > 0 ? Math.round(done / total * 100) : 0
  const progPct    = total > 0 ? Math.round(inProgress / total * 100) : 0
  const pendPct    = total > 0 ? Math.round(pending / total * 100) : 0

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  const handleDelete = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleTaskCreated = (newTask) => {
    // Inject assignee_name if possible
    const member = employees.find(e => e.id === newTask.assigned_to)
    const enriched = {
      ...newTask,
      assignee_name: member ? member.first_name + ' ' + member.last_name : null,
    }
    setTasks(prev => [enriched, ...prev])
  }

  // Today/this week/this month due counts
  const now       = new Date()
  const todayStr  = now.toISOString().split('T')[0]
  const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() + 7)
  const monthEnd  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const overdueCt = tasks.filter(t => t.due_date && t.due_date < todayStr && t.status !== 'done').length
  const todayCt   = tasks.filter(t => t.due_date === todayStr && t.status !== 'done').length
  const weekCt    = tasks.filter(t => t.due_date && new Date(t.due_date) <= weekEnd && t.status !== 'done').length
  const monthCt   = tasks.filter(t => t.due_date && new Date(t.due_date) <= monthEnd && t.status !== 'done').length

  return (
    <div className="flex gap-4 items-start">
      {/* Main kanban area */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Tasks',   value: total,      pct: null,     color: '#6366f1', bg: 'bg-indigo-500' },
            { label: 'Completed',     value: done,       pct: donePct,  color: '#22c55e', bg: 'bg-green-500'  },
            { label: 'In Progress',   value: inProgress, pct: progPct,  color: '#6366f1', bg: 'bg-blue-500'   },
            { label: 'Pending',       value: pending,    pct: pendPct,  color: '#f59e0b', bg: 'bg-amber-500'  },
          ].map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-dark-800 rounded-2xl border border-dark-600 px-4 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">{c.value}</p>
              </div>
              {c.pct !== null
                ? <MiniDonut pct={c.pct} color={c.color} size={48} />
                : <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                    <ListTodo size={18} className="text-white" />
                  </div>
              }
            </motion.div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-dark-600 bg-dark-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-dark-800 border border-dark-600 text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500">
            <option value="all">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Completed</option>
          </select>
        </div>

        {/* Kanban columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const colTasks = byCol(col.id)
            return (
              <div key={col.id} className="bg-dark-800 rounded-2xl border border-dark-600 flex flex-col min-h-[300px]">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-dark-600">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <span className="text-xs font-bold text-gray-300">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-dark-700 text-gray-400">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-96">
                  <AnimatePresence>
                    {colTasks.map(t => (
                      <TaskCard key={t.id} task={t}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                  {colTasks.length === 0 && (
                    <div className="py-6 text-center text-[10px] text-gray-500">No tasks</div>
                  )}
                </div>

                {/* Add task button */}
                <button onClick={() => setAddTaskCol(col.id)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-gray-500 hover:text-primary-400 hover:bg-primary-500/5 transition-colors border-t border-dark-600 rounded-b-2xl">
                  <Plus size={12} /> Add Task
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-56 flex-shrink-0 hidden xl:flex flex-col gap-4">
        {/* Task Progress donut */}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 p-4">
          <h4 className="text-xs font-bold text-gray-300 mb-3 flex items-center gap-1.5">
            <BarChart2 size={12} className="text-primary-500" /> Task Progress
          </h4>
          <div className="flex justify-center mb-3">
            <div className="relative">
              <svg width="80" height="80" viewBox="0 0 80 80">
                {/* Track */}
                <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="8" />
                {/* Done */}
                {done > 0 && (() => {
                  const r = 32, circ = 2*Math.PI*r
                  const d = circ*(done/total); const ip = circ*(inProgress/total); const pn = circ*(pending/total)
                  return <>
                    <circle cx="40" cy="40" r={r} fill="none" stroke="#22c55e" strokeWidth="8"
                      strokeDasharray={`${d} ${circ-d}`} strokeLinecap="round"
                      style={{transform:'rotate(-90deg)',transformOrigin:'40px 40px'}} />
                    {inProgress > 0 && <circle cx="40" cy="40" r={r} fill="none" stroke="#6366f1" strokeWidth="8"
                      strokeDasharray={`${ip} ${circ-ip}`} strokeDashoffset={-d} strokeLinecap="round"
                      style={{transform:'rotate(-90deg)',transformOrigin:'40px 40px'}} />}
                    {pending > 0 && <circle cx="40" cy="40" r={r} fill="none" stroke="#f59e0b" strokeWidth="8"
                      strokeDasharray={`${pn} ${circ-pn}`} strokeDashoffset={-(d+ip)} strokeLinecap="round"
                      style={{transform:'rotate(-90deg)',transformOrigin:'40px 40px'}} />}
                  </>
                })()}
                <text x="40" y="36" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{donePct}%</text>
                <text x="40" y="48" textAnchor="middle" fill="#94a3b8" fontSize="7">Completed</text>
              </svg>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Completed', count: done,       color: '#22c55e' },
              { label: 'In Progress', count: inProgress, color: '#6366f1' },
              { label: 'Pending',   count: pending,    color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-gray-400">{s.label}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-300">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Filters */}
        <div className="bg-dark-800 rounded-2xl border border-dark-600 p-4">
          <h4 className="text-xs font-bold text-gray-300 mb-3 flex items-center gap-1.5">
            <Flag size={12} className="text-primary-500" /> Quick Filters
          </h4>
          <div className="space-y-1">
            {[
              { label: 'All Tasks',   count: total,      dot: 'bg-primary-500', val: 'all' },
              { label: 'To Do',       count: tasks.filter(t=>t.status==='todo').length, dot: 'bg-slate-400', val: 'todo' },
              { label: 'In Progress', count: inProgress, dot: 'bg-indigo-500', val: 'in_progress' },
              { label: 'Review',      count: tasks.filter(t=>t.status==='review').length, dot: 'bg-yellow-400', val: 'review' },
              { label: 'Completed',   count: done,       dot: 'bg-green-500', val: 'done' },
            ].map(f => (
              <button key={f.val} onClick={() => setStatus(f.val)}
                className={'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] transition-colors ' +
                  (statusFilter === f.val ? 'bg-primary-500/20 text-primary-400' : 'hover:bg-dark-700 text-gray-400')}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                  {f.label}
                </div>
                <span className="font-bold">{f.count}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-dark-600 mt-3 pt-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Due Date</p>
            {[
              { label: 'Overdue',    count: overdueCt, dot: 'bg-red-500' },
              { label: 'Today',      count: todayCt,   dot: 'bg-orange-400' },
              { label: 'This Week',  count: weekCt,    dot: 'bg-yellow-400' },
              { label: 'This Month', count: monthCt,   dot: 'bg-blue-400' },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between px-2 py-1.5 text-[10px] text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${f.dot}`} />
                  {f.label}
                </div>
                <span className="font-bold">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {addTaskCol && (
          <AddTaskModal
            projectId={projectId}
            column={addTaskCol}
            employees={employees}
            onClose={() => setAddTaskCol(null)}
            onCreated={handleTaskCreated}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Team Tab ──────────────────────────────────────────────────────────────────
const TeamTab = ({ memberStats }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {memberStats.length === 0 ? (
        <div className="col-span-3 py-14 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No team members assigned</p>
        </div>
      ) : (
        memberStats.map((m, i) => {
          const name = (m.first_name + ' ' + m.last_name).trim()
          const pct  = m.total_tasks > 0 ? Math.round((m.done_tasks / m.total_tasks) * 100) : 0
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={name} src={m.avatar_url} size="md" animate={false} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.designation || 'Employee'}</p>
                </div>
                <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold capitalize flex-shrink-0">
                  {m.role}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Tasks completed</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{m.done_tasks} / {m.total_tasks}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: pct + '%' }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ background: pct === 100 ? '#22c55e' : '#6366f1' }}
                  />
                </div>
                <p className="text-right text-xs font-bold text-primary-500">{pct}%</p>
              </div>
            </motion.div>
          )
        })
      )}
    </div>
  </div>
)

// ── Reports Tab ───────────────────────────────────────────────────────────────
const DonutChart = ({ completed, inProgress, pending, total }) => {
  // Simple SVG donut
  const r = 54, cx = 70, cy = 70, stroke = 12
  const circ = 2 * Math.PI * r
  const pctDone = total > 0 ? completed / total : 0
  const pctProg = total > 0 ? inProgress / total : 0
  const pctPend = total > 0 ? pending / total : 0
  const dashDone = circ * pctDone
  const dashProg = circ * pctProg
  const dashPend = circ * pctPend
  const offDone = 0
  const offProg = -dashDone
  const offPend = -(dashDone + dashProg)
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* Background */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
      {/* Done */}
      {pctDone > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke}
          strokeDasharray={`${dashDone} ${circ - dashDone}`}
          strokeDashoffset={offDone} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }} />
      )}
      {/* In Progress */}
      {pctProg > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366f1" strokeWidth={stroke}
          strokeDasharray={`${dashProg} ${circ - dashProg}`}
          strokeDashoffset={offProg} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }} />
      )}
      {/* Pending */}
      {pctPend > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={stroke}
          strokeDasharray={`${dashPend} ${circ - dashPend}`}
          strokeDashoffset={offPend} strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }} />
      )}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">Total Tasks</text>
    </svg>
  )
}

const MiniLineChart = ({ data }) => {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-28 text-xs text-gray-400">Not enough data</div>
  )
  const W = 280, H = 100, PAD = 10
  const maxTotal = Math.max(...data.map(d => d.total), 1)
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - 2 * PAD))
  const yTotal = data.map(d => H - PAD - ((d.total / maxTotal) * (H - 2 * PAD)))
  const yDone  = data.map(d => H - PAD - ((d.completed / maxTotal) * (H - 2 * PAD)))
  const totalPath = xs.map((x, i) => (i === 0 ? `M${x},${yTotal[i]}` : `L${x},${yTotal[i]}`)).join(' ')
  const donePath  = xs.map((x, i) => (i === 0 ? `M${x},${yDone[i]}`  : `L${x},${yDone[i]}`)).join(' ')
  // Area fill for done
  const areaPath = donePath + ` L${xs[xs.length-1]},${H-PAD} L${xs[0]},${H-PAD} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28">
      <defs>
        <linearGradient id="doneGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#doneGrad)" />
      <path d={totalPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d={donePath}  fill="none" stroke="#22c55e" strokeWidth="2" />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={yDone[i]} r="2.5" fill="#22c55e" />
      ))}
      {/* X-axis labels */}
      {data.map((d, i) => (
        i % Math.max(1, Math.floor(data.length / 5)) === 0 && (
          <text key={i} x={xs[i]} y={H - 1} textAnchor="middle" fill="#64748b" fontSize="7">{d.label}</text>
        )
      ))}
    </svg>
  )
}

const ReportsTab = ({ project, projectId, currentUser }) => {
  const [reportData, setReportData]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [memberFilter, setMemberFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (memberFilter !== 'all') params.set('member_id', memberFilter)
      if (statusFilter !== 'all') params.set('status_filter', statusFilter)
      const res = await api.get(`/projects/${projectId}/reports?${params}`)
      if (res.success) setReportData(res.data)
    } catch {}
    setLoading(false)
  }, [projectId, memberFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleGenerate = async (reportName, reportType) => {
    setGenerating(true)
    try {
      const res = await api.post(`/projects/${projectId}/reports`, {
        report_name: reportName,
        report_type: reportType,
      })
      if (res.success) { toast.success('Report generated!'); load() }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
    setGenerating(false)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  const { summary, trend, memberStats, reports } = reportData || {
    summary: { total: 0, completed: 0, inProgress: 0, pending: 0 },
    trend: [], memberStats: [], reports: [],
  }

  const fmtTs = (ts) => ts ? new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 text-xs text-gray-500">
          <Calendar size={12} />
          <span>{fmtDate(project.start_date)} — {fmtDate(project.deadline || project.end_date)}</span>
        </div>
        <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option value="all">All Members</option>
          {memberStats.map(m => (
            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500">
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
        <div className="ml-auto flex gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => handleGenerate('Task Summary Report', 'task')}
            disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-primary-500/25">
            <Download size={12} /> Export Report
          </motion.button>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks',      value: summary.total,       icon: ListTodo,    bg: 'bg-indigo-500',  sub: null },
          { label: 'Completed Tasks',  value: summary.completed,   icon: CheckCircle2, bg: 'bg-green-500',  sub: summary.total > 0 ? Math.round(summary.completed/summary.total*100) + '%' : '0%' },
          { label: 'In Progress',      value: summary.inProgress,  icon: Loader2,     bg: 'bg-blue-500',   sub: null },
          { label: 'Pending',          value: summary.pending,     icon: Clock,       bg: 'bg-amber-500',  sub: null },
        ].map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon size={18} className="text-white" />
              </div>
              {c.sub && (
                <span className="text-xs font-bold text-green-400 flex items-center gap-0.5">
                  <TrendingUp size={10} /> {c.sub}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Task Completion Trend */}
        <div className="lg:col-span-1 bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <TrendingUp size={13} className="text-primary-500" /> Task Completion Trend
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Completed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"/>Total</span>
            </div>
          </div>
          <MiniLineChart data={trend} />
        </div>

        {/* Task Status Distribution */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <BarChart2 size={13} className="text-primary-500" /> Task Status Distribution
          </h3>
          <div className="flex items-center gap-4">
            <DonutChart
              completed={summary.completed}
              inProgress={summary.inProgress}
              pending={summary.pending}
              total={summary.total}
            />
            <div className="space-y-2.5 flex-1">
              {[
                { label: 'Completed', count: summary.completed,  color: '#22c55e' },
                { label: 'In Progress', count: summary.inProgress, color: '#6366f1' },
                { label: 'Pending',   count: summary.pending,    color: '#f59e0b' },
                { label: 'Review',    count: summary.review || 0, color: '#eab308' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-gray-400">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.count}</span>
                    <span className="text-[10px] text-gray-400">({summary.total > 0 ? Math.round(s.count/summary.total*100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress by Team Member */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <UserCheck size={13} className="text-primary-500" /> Progress by Team Member
          </h3>
          {memberStats.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No members</p>
          ) : (
            <div className="space-y-3">
              {memberStats.map(m => {
                const name = (m.first_name + ' ' + m.last_name).trim()
                const pct  = m.total_tasks > 0 ? Math.round(m.done_tasks / m.total_tasks * 100) : 0
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <Avatar name={name} src={m.avatar_url} size="xs" animate={false} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{m.first_name}</p>
                      <div className="h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden mt-1">
                        <motion.div initial={{ width: 0 }} animate={{ width: pct + '%' }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ background: pct === 100 ? '#22c55e' : pct > 60 ? '#6366f1' : pct > 30 ? '#06b6d4' : '#f59e0b' }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-500 flex-shrink-0 w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Project Reports table */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-600">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <FileBarChart size={14} className="text-primary-500" /> Project Reports
          </h3>
          <div className="flex gap-2">
            {[
              { name: 'Task Summary Report', type: 'task' },
              { name: 'Team Performance Report', type: 'team' },
              { name: 'Project Progress Report', type: 'project' },
            ].map(r => (
              <motion.button key={r.type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleGenerate(r.name, r.type)}
                disabled={generating}
                className="px-3 py-1.5 text-[10px] font-semibold rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white transition-colors disabled:opacity-50">
                + {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>
        {reports.length === 0 ? (
          <div className="py-10 text-center">
            <FileBarChart size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">No reports generated yet</p>
            <p className="text-[10px] text-gray-300 mt-1">Click the buttons above to generate</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-700">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide">#</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide">Report Name</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide">Generated On</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide">Generated By</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
              {reports.map((r, i) => (
                <motion.tr key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.report_name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ` + (
                      r.report_type === 'task'    ? 'bg-indigo-500/15 text-indigo-400' :
                      r.report_type === 'team'    ? 'bg-green-500/15 text-green-400' :
                      r.report_type === 'project' ? 'bg-purple-500/15 text-purple-400' :
                      'bg-gray-500/10 text-gray-400'
                    )}>
                      {r.report_type.charAt(0).toUpperCase() + r.report_type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{fmtTs(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={r.generated_by_name || '?'} src={r.generated_by_avatar} size="xs" animate={false} />
                      <span className="text-gray-500">{r.generated_by_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => toast('Download coming soon', { icon: '📥' })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-primary-500 hover:text-white transition-colors text-[10px] font-semibold">
                      <Download size={10} /> Download
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview',  icon: BarChart2 },
  { id: 'tasks',    label: 'Tasks',     icon: ListTodo },
  { id: 'team',     label: 'Team',      icon: Users },
  { id: 'reports',  label: 'Reports',   icon: FileBarChart },
]

const ProjectDetail = () => {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [tab,      setTab]      = useState('overview')
  const [data,     setData]     = useState(null)   // { project, tasks, memberStats }
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get(`/projects/${id}`)
      if (res.success) {
        setData(res.data)
      } else {
        toast.error(res.message || 'Failed to load project')
        navigate('/pm/projects')
      }
    } catch {
      toast.error('Cannot connect to server')
      navigate('/pm/projects')
    }
    setLoading(false)
    setRefreshing(false)
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const { project, tasks, memberStats } = data

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Breadcrumb + header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/pm/projects')}
          className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <button onClick={() => navigate('/pm/projects')} className="hover:text-primary-500 transition-colors">Projects</button>
            <span>›</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{project.name}</span>
          </div>
          {/* Title row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <FolderOpen size={22} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-400 mt-0.5 truncate">{project.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className={'text-xs font-bold px-2.5 py-1 rounded-full ' + statusBadge(project.status)}>
                  {statusLabel(project.status)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={11} /> {memberStats.length} Members
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={11} /> Started: {fmtDate(project.start_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => load(true)} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
                <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
                  <RefreshCw size={12} />
                </motion.div>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ' +
              (tab === t.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300')}>
            <t.icon size={13} /> {t.label}
            {t.id === 'tasks' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[10px] font-bold">
                {tasks.length}
              </span>
            )}
            {t.id === 'team' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[10px] font-bold">
                {memberStats.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {tab === 'overview' && <OverviewTab project={project} tasks={tasks} memberStats={memberStats} />}
          {tab === 'tasks'    && <TasksTab tasks={tasks} projectId={id} project={project} memberStats={memberStats} onRefresh={() => load(true)} />}
          {tab === 'team'     && <TeamTab memberStats={memberStats} />}
          {tab === 'reports'  && <ReportsTab project={project} projectId={id} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default ProjectDetail
