// ProjectKanban.jsx — Kanban board with Edit, Delete, Completion %, Unassigned filter
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, RefreshCw, Calendar, Flag,
  X, CheckCircle2, Clock, Circle, Loader2,
  FolderOpen, Edit2, Trash2, Save, UserX, Search
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#94a3b8', bgLight: 'bg-slate-50 dark:bg-slate-900/30',    border: 'border-slate-200 dark:border-slate-700',   icon: Circle },
  { id: 'in_progress', label: 'In Progress', color: '#6366f1', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-700',  icon: Loader2 },
  { id: 'done',        label: 'Done',        color: '#22c55e', bgLight: 'bg-green-50 dark:bg-green-900/20',   border: 'border-green-200 dark:border-green-700',    icon: CheckCircle2 },
]

const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'text-red-500',    bg: 'bg-red-500/10'    },
  medium: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  low:    { label: 'Low',    color: 'text-green-600',  bg: 'bg-green-500/10'  },
}

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null
const daysLeft = (d) => { if (!d) return null; return Math.ceil((new Date(d) - new Date()) / 86400000) }

const inputCls = `w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onStatusChange, onSelect, onDelete }) => {
  const [moving,   setMoving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pri     = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const days    = daysLeft(task.due_date)
  const overdue = days !== null && days < 0 && task.status !== 'done'

  const nextStatus = { todo: 'in_progress', in_progress: 'done', done: null }
  const prevStatus = { todo: null, in_progress: 'todo', done: 'in_progress' }

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

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    setDeleting(true)
    try {
      const res = await api.delete(`/tasks/${task.id}`)
      if (res.success) { toast.success('Task deleted'); onDelete(task.id) }
      else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect') }
    setDeleting(false)
  }

  return (
    <motion.div layout
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={() => onSelect(task)}
      className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-600 shadow-sm hover:shadow-md cursor-pointer transition-all p-3.5 group"
    >
      {/* Priority + actions */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pri.bg} ${pri.color}`}>
          <Flag size={9} className="inline mr-1" />{pri.label}
        </span>
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
          {/* Delete */}
          <button onClick={handleDelete} disabled={deleting}
            className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
            {deleting ? '…' : '✕'}
          </button>
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug mb-2 line-clamp-2">{task.title}</p>

      {/* Completion bar */}
      {(task.completion_percent || 0) > 0 && (
        <div className="mb-2">
          <div className="h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${task.completion_percent}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 text-right">{task.completion_percent}%</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          {task.assigned_to_name
            ? <><Avatar name={task.assigned_to_name} src={task.assigned_to_avatar} size="xs" />
                <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{task.assigned_to_name}</span></>
            : <span className="text-[10px] text-orange-500 font-semibold flex items-center gap-1">
                <UserX size={10} /> Unassigned
              </span>
          }
        </div>
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

// ── Task Edit/Detail Drawer ───────────────────────────────────────────────────
const TaskDrawer = ({ task, projectMembers, onClose, onStatusChange, onTaskUpdated, onTaskDeleted }) => {
  const [editMode,  setEditMode]  = useState(false)
  const [status,    setStatus]    = useState(task.status)
  const [form,      setForm]      = useState({
    title:              task.title || '',
    description:        task.description || '',
    priority:           task.priority || 'medium',
    due_date:           task.due_date ? task.due_date.split('T')[0] : '',
    completion_percent: task.completion_percent || 0,
    assigned_to:        task.assigned_to || '',
  })
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [allEmps,  setAllEmps]  = useState([])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const pri = PRIORITY_CONFIG[form.priority] || PRIORITY_CONFIG.medium

  // Load employees for assignee dropdown
  useEffect(() => {
    if (projectMembers?.length) {
      setAllEmps(projectMembers)
    } else {
      api.get('/employees?limit=200').then(res => {
        if (res.success) setAllEmps(res.data || [])
      }).catch(() => {})
    }
  }, [])

  const empName = (e) => e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim()

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      const res = await api.put(`/tasks/${task.id}`, {
        title:              form.title.trim(),
        description:        form.description || null,
        priority:           form.priority,
        due_date:           form.due_date || null,
        completion_percent: parseInt(form.completion_percent) || 0,
        assigned_to:        form.assigned_to || null,
      })
      if (res.success) {
        toast.success('Task updated ✅')
        onTaskUpdated({ ...task, ...res.data, ...form })
        setEditMode(false)
      } else toast.error(res.message || 'Update failed')
    } catch { toast.error('Cannot connect') }
    setSaving(false)
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus })
      if (res.success) {
        setStatus(newStatus)
        onStatusChange(task.id, newStatus)
        toast.success('Status updated')
      }
    } catch {}
  }

  const handleCompletionSave = async (pct) => {
    try {
      await api.patch(`/tasks/${task.id}/completion`, { completion_percent: pct })
      onTaskUpdated({ ...task, completion_percent: pct })
    } catch {}
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return
    setDeleting(true)
    try {
      const res = await api.delete(`/tasks/${task.id}`)
      if (res.success) { toast.success('Task deleted'); onTaskDeleted(task.id); onClose() }
      else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect') }
    setDeleting(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-md bg-white dark:bg-dark-800 h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Task Details</h2>
          <div className="flex items-center gap-2">
            {!editMode && (
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-500 hover:text-white transition-colors">
                <Edit2 size={11} /> Edit
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
              {deleting
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full" />
                : <><Trash2 size={11} /> Delete</>
              }
            </motion.button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1">

          {/* ── View Mode ── */}
          {!editMode ? (
            <>
              {/* Title + Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{task.description}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
                <div className="flex gap-2 flex-wrap">
                  {COLUMNS.map(col => (
                    <button key={col.id} onClick={() => handleStatusChange(col.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        status === col.id
                          ? 'text-white border-transparent'
                          : 'bg-white dark:bg-dark-700 border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                      style={status === col.id ? { background: col.color } : {}}>
                      <col.icon size={11} /> {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pri.bg} ${pri.color}`}>{pri.label}</span>
                </div>
                {form.due_date && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <Calendar size={13} className="text-gray-400" />
                      {fmtDate(form.due_date)}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assigned To</p>
                  {task.assigned_to_name
                    ? <div className="flex items-center gap-2">
                        <Avatar name={task.assigned_to_name} src={task.assigned_to_avatar} size="sm" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{task.assigned_to_name}</span>
                      </div>
                    : <span className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                        <UserX size={12} /> Unassigned
                      </span>
                  }
                </div>
              </div>

              {/* Completion % slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion</p>
                  <span className="text-sm font-bold text-primary-500">{form.completion_percent}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={form.completion_percent}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    setF('completion_percent', v)
                    handleCompletionSave(v)
                  }}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary-500 bg-gray-200 dark:bg-dark-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${form.completion_percent}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full" />
                </div>
              </div>
            </>
          ) : (
            /* ── Edit Mode ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Edit2 size={12} className="text-primary-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Edit Task</p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setF('title', e.target.value)}
                  className={inputCls} placeholder="Task title" autoFocus />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setF('description', e.target.value)}
                  rows={3} className={`${inputCls} resize-none`} placeholder="Task details…" />
              </div>

              {/* Priority + Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</label>
                  <select value={form.priority} onChange={e => setF('priority', e.target.value)} className={inputCls}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assign To</label>
                <select value={form.assigned_to} onChange={e => setF('assigned_to', e.target.value)} className={inputCls}>
                  <option value="">— Unassigned —</option>
                  {allEmps.map(e => {
                    const n = empName(e)
                    const id = e.id || e.employee_id
                    return <option key={id} value={id}>{n} {e.designation ? `(${e.designation})` : ''}</option>
                  })}
                </select>
              </div>

              {/* Completion % */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Completion %</label>
                  <span className="text-sm font-bold text-primary-500">{form.completion_percent}%</span>
                </div>
                <input type="range" min={0} max={100} step={5}
                  value={form.completion_percent}
                  onChange={e => setF('completion_percent', parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary-500 bg-gray-200 dark:bg-dark-600"
                />
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditMode(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                  Cancel
                </button>
                <motion.button onClick={handleSave} disabled={saving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                  {saving
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    : <><Save size={14} /> Save Changes</>
                  }
                </motion.button>
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
  const [filterUnassigned, setFilterUnassigned] = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get(`/tasks/by-project/${project.id}`)
      if (res.success) {
        setTasks(res.data || [])
      } else {
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

  const handleTaskUpdated = (updated) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    if (selected?.id === updated.id) setSelected(prev => ({ ...prev, ...updated }))
  }

  const handleTaskDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selected?.id === taskId) setSelected(null)
  }

  // Apply filters
  let filtered = tasks
  if (search) filtered = filtered.filter(t => (t.title || '').toLowerCase().includes(search.toLowerCase()))
  if (filterUnassigned) filtered = filtered.filter(t => !t.assigned_to)

  const colTasks = (colId) => filtered.filter(t => t.status === colId)
  const unassignedCount = tasks.filter(t => !t.assigned_to).length
  const completedCount  = tasks.filter(t => t.status === 'done').length
  const progress        = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

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

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="pl-7 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-32 sm:w-40" />
          </div>

          {/* Unassigned filter */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterUnassigned(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterUnassigned
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white dark:bg-dark-700 border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:border-orange-300'
            }`}
            title="Show unassigned tasks only"
          >
            <UserX size={12} />
            Unassigned {unassignedCount > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filterUnassigned ? 'bg-white/20' : 'bg-orange-500/10 text-orange-500'}`}>{unassignedCount}</span>}
          </motion.button>

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

      {/* Unassigned alert banner */}
      {unassignedCount > 0 && !filterUnassigned && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-2">
            <UserX size={14} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
              {unassignedCount} task{unassignedCount > 1 ? 's' : ''} without assignee
            </p>
          </div>
          <button onClick={() => setFilterUnassigned(true)}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline whitespace-nowrap">
            Show only →
          </button>
        </motion.div>
      )}



      {/* Kanban columns */}
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
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b-2 ${col.border} ${col.bgLight}`}
                  style={{ borderBottomColor: col.color }}>
                  <div className="flex items-center gap-2">
                    <col.icon size={14} style={{ color: col.color }} />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{col.label}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: col.color }}>
                      {colItems.length}
                    </span>
                  </div>
                </div>
                <div className={`flex-1 rounded-b-xl ${col.bgLight} p-2.5 space-y-2.5 min-h-[300px]`}>
                  <AnimatePresence mode="popLayout">
                    {colItems.length === 0 ? (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-10 text-center">
                        <col.icon size={24} style={{ color: col.color, opacity: 0.3 }} className="mb-2" />
                        <p className="text-xs text-gray-400">
                          {filterUnassigned ? 'No unassigned tasks' : 'No tasks'}
                        </p>
                      </motion.div>
                    ) : (
                      colItems.map(task => (
                        <TaskCard key={task.id} task={task}
                          onStatusChange={handleStatusChange}
                          onSelect={setSelected}
                          onDelete={handleTaskDeleted}
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

      {/* Task detail / edit drawer */}
      <AnimatePresence>
        {selected && (
          <TaskDrawer
            task={selected}
            projectMembers={project.members || []}
            onClose={() => setSelected(null)}
            onStatusChange={handleStatusChange}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default ProjectKanban
