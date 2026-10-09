// ProjectDetail.jsx — Full project detail page (Overview / Tasks / Team / Reports)
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, FolderOpen, Users, Calendar, Flag, CheckCircle2,
  Circle, Loader2, Clock, MoreHorizontal, RefreshCw, Search, Plus, X,
  BarChart2, ListTodo, UserCheck, FileBarChart, AlertCircle,
  TrendingUp, Briefcase, Download, ChevronLeft, ChevronRight,
  MessageSquare, Send, Paperclip, ThumbsUp
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api, resolveFileUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
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
        {/* Left: Project Info */}
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

        {/* Right column: Employee Progress */}
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
                {['low','medium','high'].map(p => (
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

// ── Task Chat Modal ───────────────────────────────────────────────────────────
const TaskChatModal = ({ task, onClose }) => {
  const { user } = useAuth()
  const [comments,  setComments]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [message,   setMessage]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [attached,  setAttached]  = useState(null)  // { file, name, type, preview }
  const [feedbackMode, setFeedbackMode] = useState(false)
  const bottomRef  = useRef(null)
  const fileRef    = useRef(null)

  const fmtTs = (d) => d
    ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true })
    : ''

  const loadComments = async () => {
    try {
      const res = await api.get(`/tasks/${task.id}/comments`)
      if (res.success) {
        setComments(res.data || [])
        // Mark messages from employee side as read (PM is viewing)
        api.patch(`/tasks/${task.id}/comments/read`, {}).catch(() => {})
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadComments() }, [task.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  const handleSend = async () => {
    const text = feedbackMode ? `[Feedback] ${message.trim()}` : message.trim()
    if (!text && !attached) return
    setSending(true)
    try {
      let res
      const token = localStorage.getItem('epip_token')

      if (attached) {
        const fd = new FormData()
        if (text) fd.append('content', text)
        fd.append('attachment', attached.file)
        // ── Use api.js upload() which resolves the correct BASE_URL ──────────
        res = await api.upload(`/tasks/${task.id}/comments`, fd)
      } else {
        res = await api.post(`/tasks/${task.id}/comments`, { content: text })
      }
      if (res.success) {
        setMessage('')
        setAttached(null)
        setFeedbackMode(false)
        await loadComments()
      } else toast.error(res.message || 'Send failed')
    } catch { toast.error('Cannot connect') }
    setSending(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 MB'); return }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setAttached({ file, name: file.name, type: file.type, preview })
    e.target.value = ''
  }

  // ── Who is "me"? PM = messages with author_id null ─────────────────────
  // PM comments have author_id = null (or author_name_override = PM name)
  const isMyMsg = (msg) => msg.author_id === null || msg.author_id === undefined

  const STATUS_COLORS = {
    done: 'bg-green-500/15 text-green-400', in_progress: 'bg-blue-500/15 text-blue-400',
    review: 'bg-yellow-500/15 text-yellow-400', todo: 'bg-gray-500/15 text-gray-400',
  }
  const STATUS_LABELS = { done: 'Done', in_progress: 'In Progress', review: 'Review', todo: 'Pending' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full sm:max-w-2xl bg-white dark:bg-dark-800 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-dark-600">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{task.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || STATUS_COLORS.todo}`}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
              {task.assignee_name && <span>👤 {task.assignee_name}</span>}
              {task.due_date && <span>📅 Due: {new Date(task.due_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>}
              <span className="flex items-center gap-0.5"><MessageSquare size={10} /> {comments.length} messages</span>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation about this task</p>
            </div>
          ) : (
            comments.map((msg) => {
              const mine = isMyMsg(msg)
              const isFeedback = msg.content?.startsWith('[Feedback]')
              const displayContent = isFeedback
                ? msg.content.replace('[Feedback] ', '')
                : msg.content

              return (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!mine && <Avatar name={msg.author_name || 'Employee'} src={msg.avatar_url} size="sm" />}

                  <div className={`max-w-[72%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && (
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-1">
                        {msg.author_name}
                      </span>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      mine
                        ? isFeedback
                          ? 'bg-amber-500 text-white rounded-br-sm'
                          : 'bg-primary-500 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                    }`}>
                      {isFeedback && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold mb-1.5 ${mine ? 'text-amber-100' : 'text-amber-600'}`}>
                          <ThumbsUp size={10} /> FEEDBACK
                        </div>
                      )}
                      {displayContent && <p>{displayContent}</p>}
                      {(msg.file_url || msg.file_data) && (() => {
                        // ── Prefer base64 (Railway-safe), fallback to URL ──────
                        const absUrl  = msg.file_data || resolveFileUrl(msg.file_url)
                        // Stale Cloudinary path — file no longer available
                        if (!absUrl && !msg.file_data) return (
                          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-600/40 bg-gray-700/30 text-gray-500 text-[11px]">
                            <span>📎</span>
                            <span className="truncate">{msg.file_name || 'Attachment'}</span>
                            <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">Unavailable</span>
                          </div>
                        )

                        const isImage = msg.file_type?.startsWith('image/')
                        const isVideo = msg.file_type?.startsWith('video/')

                        const doDownload = (e) => {
                          e.stopPropagation()
                          const a = document.createElement('a')
                          a.href     = absUrl
                          a.download = msg.file_name || 'attachment'
                          document.body.appendChild(a); a.click(); document.body.removeChild(a)
                        }

                        return (
                          <div className="mt-2">
                            {isImage ? (
                              // Image — show inline, click to download
                              <div className="space-y-1">
                                <img src={absUrl} alt={msg.file_name}
                                  onClick={doDownload}
                                  className="max-w-[220px] rounded-xl border border-white/20 cursor-pointer hover:opacity-90 transition-opacity" />
                                <p className={`text-[10px] ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                                  Tap to download
                                </p>
                              </div>
                            ) : isVideo ? (
                              // Video — play inline, download button below
                              <div className="space-y-1.5">
                                <video src={absUrl} controls
                                  className="max-w-[240px] rounded-xl border border-white/20"
                                  style={{ maxHeight: 160 }} />
                                <button onClick={doDownload}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium w-full justify-center transition-colors ${
                                    mine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                  }`}>
                                  ⬇ Download video
                                </button>
                              </div>
                            ) : (
                              // PDF / Excel / ZIP / Word — file card with download
                              <button onClick={doDownload}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border w-full text-left transition-colors ${
                                  mine ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 hover:bg-gray-50 dark:hover:bg-dark-500'
                                }`}>
                                <span className="text-2xl flex-shrink-0">
                                  {msg.file_name?.match(/\.pdf$/i) ? '📄'
                                    : msg.file_name?.match(/\.(xlsx?|csv)$/i) ? '📊'
                                    : msg.file_name?.match(/\.(zip|rar|7z)$/i) ? '🗜️'
                                    : msg.file_name?.match(/\.(docx?)$/i) ? '📝'
                                    : msg.file_name?.match(/\.(mp4|mov|avi)$/i) ? '🎥' : '📎'}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-semibold truncate ${mine ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {msg.file_name || 'Attachment'}
                                  </p>
                                  <p className={`text-[9px] mt-0.5 ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                                    {msg.file_size_kb
                                      ? msg.file_size_kb >= 1024
                                        ? `${(msg.file_size_kb / 1024).toFixed(1)} MB`
                                        : `${msg.file_size_kb} KB`
                                      : ''} · Tap to download
                                  </p>
                                </div>
                                <span className={`text-lg flex-shrink-0 ${mine ? 'text-white/80' : 'text-gray-400'}`}>⬇</span>
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                    <span className="text-[10px] text-gray-400 mx-1">{fmtTs(msg.created_at)}</span>
                  </div>
                </motion.div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Attached file preview */}
        {attached && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-600">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
              {attached.preview
                ? <img src={attached.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                : <Paperclip size={16} className="text-primary-500 flex-shrink-0" />
              }
              <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{attached.name}</span>
              <button onClick={() => setAttached(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Feedback mode banner */}
        {feedbackMode && (
          <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ThumbsUp size={12} /> Feedback mode — message will be tagged as feedback
              </span>
              <button onClick={() => setFeedbackMode(false)} className="text-amber-500 hover:text-amber-700 text-xs">Cancel</button>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 rounded-b-2xl">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-end gap-2 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-600 px-3 py-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={feedbackMode ? 'Write feedback...' : 'Type a message...'}
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* File attach */}
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv" />
              <button onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                title="Attach file">
                <Paperclip size={18} />
              </button>

              {/* Feedback */}
              <button onClick={() => setFeedbackMode(f => !f)}
                className={`p-2 rounded-xl transition-colors ${feedbackMode ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
                title="Send as feedback">
                <ThumbsUp size={18} />
              </button>

              {/* Send */}
              <button onClick={handleSend} disabled={sending || (!message.trim() && !attached)}
                className="p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors"
                title="Send">
                {sending
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                      className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full" />
                  : <Send size={18} />
                }
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const TasksTab = ({ tasks, projectId, project, memberStats, weekStart, setWeekStart }) => {
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
  const DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  const DAY_COLORS = {
    Monday:    { bg: 'bg-blue-500',    text: 'text-white', bar: '#3b82f6' },
    Tuesday:   { bg: 'bg-purple-500',  text: 'text-white', bar: '#a855f7' },
    Wednesday: { bg: 'bg-orange-400',  text: 'text-white', bar: '#fb923c' },
    Thursday:  { bg: 'bg-teal-500',    text: 'text-white', bar: '#14b8a6' },
    Friday:    { bg: 'bg-pink-500',    text: 'text-white', bar: '#ec4899' },
    Saturday:  { bg: 'bg-indigo-400',  text: 'text-white', bar: '#818cf8' },
    Sunday:    { bg: 'bg-violet-500',  text: 'text-white', bar: '#8b5cf6' },
  }

  const STATUS_MAP = {
    done:        { label: 'Completed',   dot: 'bg-green-500',  pill: 'bg-green-500/15 text-green-400 border border-green-500/30' },
    in_progress: { label: 'In Progress', dot: 'bg-blue-500',   pill: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
    review:      { label: 'Review',      dot: 'bg-yellow-400', pill: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
    todo:        { label: 'Pending',     dot: 'bg-gray-500',   pill: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
  }

  const [editingTime, setEditingTime] = useState(null)
  const [savingTime,  setSavingTime]  = useState(null)
  const [chatTask,    setChatTask]    = useState(null) // task to open chat for

  const handleTimeSave = async (taskId, field, value) => {
    if (!value?.trim()) { setEditingTime(null); return }
    setSavingTime(`${taskId}-${field}`)
    try {
      const body = field === 'start' ? { start_time: value.trim() } : { end_time: value.trim() }
      await api.put(`/tasks/${taskId}`, body)
    } catch {}
    setSavingTime(null)
    setEditingTime(null)
  }

  const parseDuration = (desc, startTime, endTime) => {
    if (startTime && endTime) {
      try {
        const parseTime = (t) => {
          const [time, period] = t.trim().split(' ')
          let [h, m] = time.split(':').map(Number)
          if (period?.toUpperCase() === 'PM' && h !== 12) h += 12
          if (period?.toUpperCase() === 'AM' && h === 12) h = 0
          return h * 60 + (m || 0)
        }
        const diff = parseTime(endTime) - parseTime(startTime)
        if (diff > 0) {
          const hrs = Math.floor(diff / 60); const mins = diff % 60
          if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
          if (hrs > 0) return `${hrs}h`
          return `${mins}m`
        }
      } catch {}
    }
    if (!desc) return '—'
    const m = desc.match(/\((\d+)\s*min\)/)
    if (!m) return '—'
    const mins = parseInt(m[1])
    if (mins === 0) return '—'
    if (mins >= 60) return `${Math.round(mins / 60)}h`
    return `${mins}m`
  }

  // ── Group tasks by due_date (date-wise) ────────────────────────────────────
  const fmtGroupDate = (d) => {
    if (!d) return 'No Due Date'
    const date = new Date(d)
    const today = new Date(); today.setHours(0,0,0,0)
    const tom   = new Date(today); tom.setDate(today.getDate() + 1)
    const yest  = new Date(today); yest.setDate(today.getDate() - 1)
    const dateOnly = new Date(d); dateOnly.setHours(0,0,0,0)
    if (dateOnly.getTime() === today.getTime()) return 'Today'
    if (dateOnly.getTime() === tom.getTime())   return 'Tomorrow'
    if (dateOnly.getTime() === yest.getTime())  return 'Yesterday'
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  const groupedTasks = tasks.reduce((acc, t) => {
    const key = t.due_date ? t.due_date.toString().split('T')[0] : '__nodate__'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  // Sort groups: tasks with dates first (ascending), then no-date
  const sortedKeys = Object.keys(groupedTasks).sort((a, b) => {
    if (a === '__nodate__') return 1
    if (b === '__nodate__') return -1
    return a.localeCompare(b)
  })

  const defaultRows = [
    { seq: 0, day: 'Monday',    taskName: 'Project Setup & Requirements', start: '09:00 AM', end: '11:00 AM', duration: '2h',  status: 'todo', pct: 0, hasTask: false },
    { seq: 1, day: 'Tuesday',   taskName: 'Design & Planning',            start: '09:00 AM', end: '12:00 PM', duration: '3h',  status: 'todo', pct: 0, hasTask: false },
    { seq: 2, day: 'Wednesday', taskName: 'Development',                  start: '09:00 AM', end: '01:00 PM', duration: '4h',  status: 'todo', pct: 0, hasTask: false },
    { seq: 3, day: 'Thursday',  taskName: 'Testing & QA',                 start: '10:00 AM', end: '02:00 PM', duration: '4h',  status: 'todo', pct: 0, hasTask: false },
    { seq: 4, day: 'Friday',    taskName: 'Content & Documentation',      start: '09:00 AM', end: '12:00 PM', duration: '3h',  status: 'todo', pct: 0, hasTask: false },
    { seq: 5, day: 'Saturday',  taskName: 'Review & Feedback',            start: '10:00 AM', end: '01:00 PM', duration: '3h',  status: 'todo', pct: 0, hasTask: false },
    { seq: 6, day: 'Sunday',    taskName: 'Final Submission',             start: '09:00 AM', end: '11:00 AM', duration: '2h',  status: 'todo', pct: 0, hasTask: false },
  ]

  const allRows = tasks.length > 0
    ? tasks.map((t, i) => ({
        seq: i, day: DAYS[i % 7], taskName: t.title, taskId: t.id, taskObj: t,
        start: t.start_time || '09:00 AM', end: t.end_time || '05:00 PM',
        duration: parseDuration(t.description, t.start_time, t.end_time),
        status: t.status || 'todo', pct: t.completion_percent || 0, hasTask: true,
        due_date: t.due_date, groupKey: t.due_date ? t.due_date.toString().split('T')[0] : '__nodate__',
      }))
    : defaultRows.map((r, i) => ({ ...r, groupKey: '__nodate__' }))

  return (
    <div className="space-y-4">
      {/* Chat modal */}
      <AnimatePresence>
        {chatTask && (
          <TaskChatModal task={chatTask} onClose={() => setChatTask(null)} />
        )}
      </AnimatePresence>

      {tasks.length === 0 ? (
        /* No tasks — show default placeholder table */
        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm bg-white dark:bg-dark-800">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-600">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Day</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"><span className="flex items-center gap-1.5"><ListTodo size={12}/> Task</span></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Start</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">End</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Completion</th>
                {DAY_SHORT.map(d => <th key={d} className="px-2 py-3 text-center text-xs font-semibold text-gray-400 uppercase w-12">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
              {defaultRows.map((row, i) => {
                const col = DAY_COLORS[row.day]; const st = STATUS_MAP[row.status]
                return (
                  <tr key={i} className="opacity-40">
                    <td className="px-4 py-3.5"><span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold ${col.bg} ${col.text} min-w-[90px]`}>{row.day}</span></td>
                    <td className="px-4 py-3.5"><p className="text-sm text-gray-400 max-w-[220px]">{row.taskName}</p></td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">{row.start}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">{row.end}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-400">{row.duration}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}</span></td>
                    <td className="px-4 py-3.5 min-w-[120px]"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full"/><span className="text-xs text-gray-400 w-8 text-right">0%</span></div></td>
                    {DAY_SHORT.map((d, di) => <td key={d} className="px-1.5 py-3.5 text-center">{di === i % 7 ? <div className="h-5 rounded-md mx-auto" style={{ background: col.bar, width: 36 }}/> : null}</td>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Real tasks — grouped by due_date */
        sortedKeys.map(groupKey => {
          const groupTasks = groupedTasks[groupKey]
          const groupLabel = groupKey === '__nodate__' ? 'No Due Date' : fmtGroupDate(groupKey)
          const isNodDate  = groupKey === '__nodate__'
          const groupDate  = groupKey !== '__nodate__' ? new Date(groupKey) : null
          const isOverdueGroup = groupDate && groupDate < new Date() && groupDate.setHours(0,0,0,0) < new Date().setHours(0,0,0,0)

          return (
            <div key={groupKey} className="space-y-1">
              {/* Date group header */}
              <div className="flex items-center gap-3 px-1">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  groupLabel === 'Today'     ? 'bg-primary-500/15 text-primary-500' :
                  groupLabel === 'Tomorrow'  ? 'bg-green-500/15 text-green-500' :
                  isOverdueGroup             ? 'bg-red-500/15 text-red-500' :
                  isNodDate                  ? 'bg-gray-500/15 text-gray-400' :
                                              'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'
                }`}>
                  <Calendar size={12} />
                  {groupLabel}
                </div>
                <div className="flex-1 h-px bg-gray-100 dark:bg-dark-600" />
                <span className="text-[11px] text-gray-400 font-medium">{groupTasks.length} task{groupTasks.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Task rows */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm bg-white dark:bg-dark-800">
                <table className="w-full text-sm" style={{ minWidth: 900 }}>
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-dark-600">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-28">Day</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide"><span className="flex items-center gap-1.5"><ListTodo size={11}/> Task</span></th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Start</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">End</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Duration</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Completion</th>
                      {DAY_SHORT.map(d => <th key={d} className="px-2 py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase w-10">{d}</th>)}
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-400 uppercase w-16">Chat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                    {groupTasks.map((t, i) => {
                      const globalIdx = allRows.findIndex(r => r.taskId === t.id)
                      const col = DAY_COLORS[DAYS[globalIdx % 7]]
                      const st  = STATUS_MAP[t.status] || STATUS_MAP.todo
                      const ganttCol = globalIdx % 7
                      const startTime = t.start_time || '09:00 AM'
                      const endTime   = t.end_time   || '05:00 PM'
                      const dur = parseDuration(t.description, t.start_time, t.end_time)

                      return (
                        <motion.tr key={t.id}
                          initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.3) }}
                          className="hover:bg-gray-50/50 dark:hover:bg-dark-700/30 transition-colors"
                        >
                          {/* Day badge */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-[9px] font-mono text-gray-400">#{String(globalIdx + 1).padStart(2,'0')}</span>
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${col.bg} ${col.text} min-w-[80px]`}>
                                {DAYS[globalIdx % 7]}
                              </span>
                            </div>
                          </td>

                          {/* Task name */}
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 max-w-[200px] leading-snug">{t.title}</p>
                            {t.assignee_name && (
                              <p className="text-[10px] text-gray-400 mt-0.5">👤 {t.assignee_name}</p>
                            )}
                          </td>

                          {/* Start — inline editable */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingTime?.taskId === t.id && editingTime?.field === 'start' ? (
                              <input autoFocus defaultValue={startTime}
                                onBlur={e => handleTimeSave(t.id, 'start', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingTime(null) }}
                                className="w-24 px-2 py-1 text-xs rounded-lg border border-primary-500 bg-dark-700 text-white focus:outline-none" />
                            ) : (
                              <span onClick={() => setEditingTime({ taskId: t.id, field: 'start' })}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-400 hover:underline"
                                title="Click to edit">
                                {savingTime === `${t.id}-start` ? '...' : startTime}
                              </span>
                            )}
                          </td>

                          {/* End — inline editable */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {editingTime?.taskId === t.id && editingTime?.field === 'end' ? (
                              <input autoFocus defaultValue={endTime}
                                onBlur={e => handleTimeSave(t.id, 'end', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingTime(null) }}
                                className="w-24 px-2 py-1 text-xs rounded-lg border border-primary-500 bg-dark-700 text-white focus:outline-none" />
                            ) : (
                              <span onClick={() => setEditingTime({ taskId: t.id, field: 'end' })}
                                className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-400 hover:underline"
                                title="Click to edit">
                                {savingTime === `${t.id}-end` ? '...' : endTime}
                              </span>
                            )}
                          </td>

                          {/* Duration */}
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">{dur}</td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                            </span>
                          </td>

                          {/* Completion */}
                          <td className="px-4 py-3 min-w-[100px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: (t.completion_percent || 0) + '%' }}
                                  transition={{ duration: 0.8 }} className="h-full rounded-full"
                                  style={{ background: col.bar }} />
                              </div>
                              <span className="text-[11px] font-bold text-gray-400 w-8 text-right">{t.completion_percent || 0}%</span>
                            </div>
                          </td>

                          {/* Gantt bars */}
                          {DAY_SHORT.map((d, di) => (
                            <td key={d} className="px-1.5 py-3 text-center">
                              {di === ganttCol ? (
                                <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                  transition={{ duration: 0.4 }} className="h-4 rounded-md mx-auto"
                                  style={{ background: col.bar, width: 28, transformOrigin: 'left' }} />
                              ) : null}
                            </td>
                          ))}

                          {/* Chat button */}
                          <td className="px-3 py-3 text-center">
                            <motion.button
                              onClick={() => setChatTask(t)}
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors"
                              title={`Chat about: ${t.title}`}
                            >
                              <MessageSquare size={14} />
                            </motion.button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
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
// ── Task Assignment Tab ───────────────────────────────────────────────────────
const TaskAssignmentTab = ({ tasks, memberStats }) => {
  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
        <UserCheck size={28} className="text-primary-400" />
      </div>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks assigned yet</p>
      <p className="text-xs text-gray-400 mt-1">Tasks assigned in this project will appear here</p>
    </div>
  )

  // Group tasks by assignee
  const grouped = {}
  tasks.forEach(t => {
    const key = t.assigned_to ?? 'unassigned'
    if (!grouped[key]) grouped[key] = { member: memberStats.find(m => m.id === t.assigned_to) || null, tasks: [] }
    grouped[key].tasks.push(t)
  })

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([key, { member, tasks: mTasks }]) => {
        const name = member ? (member.first_name + ' ' + member.last_name).trim() : 'Unassigned'
        const done = mTasks.filter(t => t.status === 'done').length
        const pct  = mTasks.length > 0 ? Math.round((done / mTasks.length) * 100) : 0
        return (
          <div key={key} className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
            {/* Member header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-dark-700 bg-gray-50/50 dark:bg-dark-700/40">
              {member
                ? <Avatar name={name} src={member.avatar_url} size="sm" animate={false} />
                : <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center"><UserCheck size={14} className="text-gray-400" /></div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{name}</p>
                <p className="text-[10px] text-gray-400">{member?.designation || member?.role || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{mTasks.length} task{mTasks.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: pct + '%' }} />
                  </div>
                  <span className="text-[10px] font-bold text-primary-500">{pct}%</span>
                </div>
              </div>
            </div>

            {/* Task list */}
            <div className="divide-y divide-gray-50 dark:divide-dark-700">
              {mTasks.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-shrink-0">{taskStatusIcon(t.status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
                    {t.description && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.due_date && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Calendar size={9} /> {fmtDate(t.due_date)}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                      t.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                      t.priority === 'high'   ? 'bg-orange-500/10 text-orange-500' :
                      t.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600' :
                                                'bg-gray-100 text-gray-500 dark:bg-dark-700'
                    }`}>{t.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.status === 'done'        ? 'bg-green-500/10 text-green-500' :
                      t.status === 'in_progress' ? 'bg-indigo-500/10 text-indigo-400' :
                      t.status === 'review'      ? 'bg-yellow-500/10 text-yellow-600' :
                                                   'bg-gray-100 text-gray-500 dark:bg-dark-700'
                    }`}>{taskStatusLabel(t.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'tasks',    label: 'Tasks',    icon: ListTodo     },
  { id: 'overview', label: 'Overview', icon: BarChart2    },
  { id: 'team',     label: 'Team',     icon: Users        },
  { id: 'reports',  label: 'Reports',  icon: FileBarChart },
]

const ProjectDetail = () => {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const [tab,      setTab]      = useState('tasks')
  const [data,     setData]     = useState(null)   // { project, tasks, memberStats }
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── Week date range state (shared between header date picker + TasksTab) ──
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = (day === 0 ? -6 : 1 - day)
    const mon = new Date(now)
    mon.setDate(now.getDate() + diff)
    mon.setHours(0, 0, 0, 0)
    return mon
  })

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
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              {/* Date Range Picker */}
              <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 shadow-sm">
                <button
                  onClick={() => {
                    const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d)
                  }}
                  className="p-0.5 rounded text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <div className="flex items-center gap-1.5 px-1">
                  <Calendar size={12} className="text-primary-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {weekStart.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    {' – '}
                    {(() => { const e = new Date(weekStart); e.setDate(e.getDate() + 6); return e.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) })()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d)
                  }}
                  className="p-0.5 rounded text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              {/* Refresh Button */}
              <motion.button
                onClick={() => load(true)}
                disabled={refreshing}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold shadow-md shadow-primary-500/25 disabled:opacity-60 transition-colors"
              >
                <motion.div
                  animate={refreshing ? { rotate: 360 } : {}}
                  transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
                >
                  <RefreshCw size={13} />
                </motion.div>
                Refresh
              </motion.button>
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
          {tab === 'tasks'    && <TasksTab tasks={tasks} projectId={id} project={project} memberStats={memberStats} weekStart={weekStart} setWeekStart={setWeekStart} />}
          {tab === 'overview' && <OverviewTab project={project} tasks={tasks} memberStats={memberStats} />}
          {tab === 'team'     && <TeamTab memberStats={memberStats} />}
          {tab === 'reports'  && <ReportsTab project={project} projectId={id} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default ProjectDetail
