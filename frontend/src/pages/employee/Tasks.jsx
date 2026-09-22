import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, RefreshCw, FolderOpen
} from 'lucide-react'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

// Status options — as requested
const STATUS_OPTIONS = [
  { value: 'todo',          label: 'Open',          dot: 'bg-gray-400',   pill: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-400' },
  { value: 'in_progress',   label: 'In Progress',   dot: 'bg-blue-500',   pill: 'bg-blue-500 text-white' },
  { value: 'review',        label: 'In Review',     dot: 'bg-purple-500', pill: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  { value: 'to_be_tested',  label: 'To be Tested',  dot: 'bg-yellow-500', pill: 'bg-yellow-400 text-white' },
  { value: 'done',          label: 'Closed',        dot: 'bg-green-500',  pill: 'bg-green-500 text-white' },
]

const PRIORITY_COLOR = {
  low:    'bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  high:   'bg-orange-400 text-white',
  urgent: 'bg-red-500 text-white',
}

const getStatusCfg  = (val) => STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const daysLeft = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

// ── Status Dropdown ───────────────────────────────────────────────────────────
const StatusDropdown = ({ taskId, currentStatus, onUpdated }) => {
  const [open,   setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)
  const cfg = getStatusCfg(currentStatus)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleSelect = async (val) => {
    if (val === currentStatus) { setOpen(false); return }
    setSaving(true)
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: val })
      if (res.success) {
        onUpdated(taskId, val, val === 'done' ? 100 : undefined)
        toast.success('Status updated')
      } else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
    setSaving(false)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-90 active:scale-95 whitespace-nowrap ${cfg.pill}`}
      >
        {saving
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
              className="w-2.5 h-2.5 border-2 border-current/30 border-t-current rounded-full" />
          : <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        }
        {cfg.label}
        <ChevronDown size={10} className={`transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-50 w-44 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-gray-100 dark:border-dark-600 overflow-hidden"
          >
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 text-left ${
                  opt.value === currentStatus
                    ? 'bg-primary-500/5 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                {opt.label}
                {opt.value === currentStatus && <CheckCircle size={11} className="ml-auto text-primary-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Completion Input (inline editable) ───────────────────────────────────────
const CompletionCell = ({ taskId, value, onUpdated }) => {
  const [editing, setEditing] = useState(false)
  const [val,     setVal]     = useState(value ?? 0)
  const [saving,  setSaving]  = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setVal(value ?? 0) }, [value])

  const save = async () => {
    const pct = Math.min(100, Math.max(0, parseInt(val) || 0))
    setVal(pct)
    setSaving(true)
    try {
      const res = await api.patch(`/tasks/${taskId}/completion`, { completion_percent: pct })
      if (res.success) {
        onUpdated(taskId, pct)
        toast.success(`Completion → ${pct}%`)
      } else toast.error('Failed to update')
    } catch { toast.error('Cannot connect') }
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={0} max={100}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          autoFocus
          className="w-16 px-2 py-0.5 text-xs rounded-lg border border-primary-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white outline-none text-center font-mono"
        />
        <span className="text-xs text-gray-400">%</span>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setEditing(true) }}
      className="flex items-center gap-1.5 group hover:bg-gray-50 dark:hover:bg-dark-700 px-2 py-1 rounded-lg transition-colors"
      title="Click to edit completion %"
    >
      {/* Mini circular indicator */}
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor"
            className="text-gray-100 dark:text-dark-600" strokeWidth="3" />
          <circle cx="16" cy="16" r="12" fill="none"
            stroke={val >= 100 ? '#22c55e' : val >= 60 ? '#3b82f6' : val >= 30 ? '#f59e0b' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={`${(val / 100) * 75.4} 75.4`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-700 dark:text-gray-200">
          {val}%
        </span>
      </div>
      {saving && (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
          className="w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
      )}
    </button>
  )
}

// ── Table Row ─────────────────────────────────────────────────────────────────
const TableRow = ({ task, index, onStatusUpdated, onCompletionUpdated }) => {
  const days      = daysLeft(task.due_date)
  const isOverdue = days !== null && days < 0 && task.status !== 'done'
  const isDueSoon = days !== null && days >= 0 && days <= 3
  const taskCode  = `EZ3-T${task.id}`
  const duration  = task.due_date && task.created_at
    ? Math.max(1, Math.ceil((new Date(task.due_date) - new Date(task.created_at)) / 86400000))
    : null

  return (
    <motion.tr
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`border-b border-gray-100 dark:border-dark-600 hover:bg-blue-50/30 dark:hover:bg-dark-700/40 transition-colors ${
        task.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      {/* Checkbox + ID */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${
            task.status === 'done'
              ? 'bg-green-500 border-green-500'
              : 'border-gray-300 dark:border-dark-500'
          }`}>
            {task.status === 'done' && (
              <svg viewBox="0 0 10 10" className="w-full h-full p-0.5" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-[10px] font-mono font-semibold text-primary-500 whitespace-nowrap">{taskCode}</span>
        </div>
      </td>

      {/* Task Name */}
      <td className="px-3 py-3 min-w-[180px] max-w-[260px]">
        <p className={`text-sm font-medium leading-tight ${
          task.status === 'done'
            ? 'line-through text-gray-400 dark:text-gray-500'
            : 'text-gray-800 dark:text-gray-200'
        }`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
        )}
      </td>

      {/* Project */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.project_name ? (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <FolderOpen size={11} className="text-primary-400 flex-shrink-0" />
            <span className="truncate max-w-[90px]">{task.project_name}</span>
          </div>
        ) : (
          <span className="text-gray-300 dark:text-dark-500 text-xs">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3 whitespace-nowrap">
        <StatusDropdown
          taskId={task.id}
          currentStatus={task.status}
          onUpdated={onStatusUpdated}
        />
      </td>

      {/* Priority */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>
          {task.priority}
        </span>
      </td>

      {/* Completion % */}
      <td className="px-3 py-3 whitespace-nowrap">
        <CompletionCell
          taskId={task.id}
          value={task.completion_percent}
          onUpdated={onCompletionUpdated}
        />
      </td>

      {/* Start Date */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(task.created_at)}</span>
      </td>

      {/* Due Date */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div>
          <span className={`text-xs font-medium ${
            isOverdue ? 'text-red-500 font-bold' : isDueSoon ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {fmtDate(task.due_date)}
          </span>
          {task.due_date && days !== null && task.status !== 'done' && (
            <p className={`text-[10px] mt-0.5 ${
              isOverdue ? 'text-red-400' : isDueSoon ? 'text-orange-400' : 'text-gray-400'
            }`}>
              {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `(${days} day${days !== 1 ? 's' : ''} to go)`}
            </p>
          )}
        </div>
      </td>

      {/* Duration */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {duration ? `${duration} day${duration !== 1 ? 's' : ''}` : '—'}
        </span>
      </td>
    </motion.tr>
  )
}

// ── Mobile Card ───────────────────────────────────────────────────────────────
const MobileCard = ({ task, index, onStatusUpdated, onCompletionUpdated }) => {
  const days      = daysLeft(task.due_date)
  const isOverdue = days !== null && days < 0 && task.status !== 'done'
  const taskCode  = `EZ3-T${task.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4 space-y-3 ${
        task.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-semibold text-primary-500">{taskCode}</p>
          <p className={`text-sm font-semibold leading-tight mt-0.5 ${
            task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
          }`}>{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize flex-shrink-0 ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium}`}>
          {task.priority}
        </span>
      </div>

      {/* Status + Completion */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatusDropdown taskId={task.id} currentStatus={task.status} onUpdated={onStatusUpdated} />
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Completion:</span>
          <CompletionCell taskId={task.id} value={task.completion_percent} onUpdated={onCompletionUpdated} />
        </div>
      </div>

      {/* Project */}
      {task.project_name && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <FolderOpen size={11} className="text-primary-400" />{task.project_name}
        </div>
      )}

      {/* Dates */}
      <div className="flex gap-4 text-xs pt-2 border-t border-gray-100 dark:border-dark-600">
        <span className="text-gray-400">Start: {fmtDate(task.created_at)}</span>
        <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          Due: {fmtDate(task.due_date)}
          {days !== null && task.status !== 'done' && task.due_date && (
            <span className="font-normal ml-1">
              ({isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `${days}d left`})
            </span>
          )}
        </span>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeTasks = () => {
  const now = new Date()
  const [month,      setMonth]      = useState(now.getMonth() + 1)
  const [year,       setYear]       = useState(now.getFullYear())
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = async (m = month, y = year, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get(`/tasks/my?month=${m}&year=${y}`)
      if (res.success) setTasks(res.data || [])
      else setTasks([])
    } catch { setTasks([]) }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load(month, year) }, [month, year])

  const handleStatusUpdated = (taskId, newStatus, newPct) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, ...(newPct !== undefined ? { completion_percent: newPct } : {}) }
        : t
    ))
  }

  const handleCompletionUpdated = (taskId, pct) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completion_percent: pct } : t))
  }

  // Month nav
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  // Search only
  const filtered = tasks.filter(t =>
    !search ||
    (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.project_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const TABLE_COLS = ['', 'Task Name', 'Project', 'Status', 'Priority', 'Completion', 'Start Date', 'Due Date', 'Duration']

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {MONTHS[month - 1]} {year} · Click status or completion to update
          </p>
        </div>
        <button onClick={() => load(month, year, true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
          <motion.div animate={refreshing ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={13} />
          </motion.div>
          Refresh
        </button>
      </motion.div>

      {/* Month nav + Search */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

        {/* Month switcher */}
        <div className="flex items-center gap-2 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-600 px-3 py-2 flex-shrink-0">
          <button onClick={prevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <div className="flex items-center gap-2 min-w-[130px] justify-center">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
              {MONTHS[month - 1]} {year}
            </span>
            {isCurrentMonth && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400">
                Current
              </span>
            )}
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isCurrentMonth ? 'text-gray-200 dark:text-dark-600 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500'
            }`}>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks or projects…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>

        <span className="text-xs text-gray-400 flex-shrink-0 self-center">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </span>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {search ? 'No matching tasks' : `No tasks for ${MONTHS[month - 1]} ${year}`}
          </h3>
          <p className="text-sm text-gray-400">
            {search ? 'Try a different search' : 'Tasks assigned by your Project Manager will appear here'}
          </p>
        </motion.div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="hidden sm:block bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 900 }}>
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-700 border-b border-gray-100 dark:border-dark-600">
                    {TABLE_COLS.map(col => (
                      <th key={col}
                        className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((task, i) => (
                      <TableRow
                        key={task.id}
                        task={task}
                        index={i}
                        onStatusUpdated={handleStatusUpdated}
                        onCompletionUpdated={handleCompletionUpdated}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {/* Footer summary */}
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600 flex items-center justify-between text-xs text-gray-400">
              <span>Showing {filtered.length} of {tasks.length} tasks · {MONTHS[month - 1]} {year}</span>
              <div className="flex items-center gap-4">
                {STATUS_OPTIONS.map(s => {
                  const count = tasks.filter(t => t.status === s.value).length
                  if (!count) return null
                  return (
                    <span key={s.value} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                      {count} {s.label}
                    </span>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* ── Mobile Cards ── */}
          <div className="sm:hidden space-y-3">
            <AnimatePresence>
              {filtered.map((task, i) => (
                <MobileCard
                  key={task.id}
                  task={task}
                  index={i}
                  onStatusUpdated={handleStatusUpdated}
                  onCompletionUpdated={handleCompletionUpdated}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}

export default EmployeeTasks
