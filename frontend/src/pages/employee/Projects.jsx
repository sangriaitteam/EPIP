import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Search, Clock, CheckCircle,
  TrendingUp, AlertCircle, RefreshCw, ChevronDown,
  Calendar, Users, BarChart3
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import StatCard from '../../components/common/StatCard'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const daysLeft = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

// ── Status options (Zoho style) ───────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'Active',       dot: 'bg-green-500',  pill: 'bg-green-500 text-white' },
  { value: 'planning',    label: 'In Progress',  dot: 'bg-blue-500',   pill: 'bg-blue-500 text-white' },
  { value: 'review',      label: 'On Track',     dot: 'bg-cyan-400',   pill: 'bg-cyan-400 text-white' },
  { value: 'on_hold',     label: 'Delayed',      dot: 'bg-yellow-500', pill: 'bg-yellow-500 text-white' },
  { value: 'cancelled',   label: 'In Testing',   dot: 'bg-orange-400', pill: 'bg-orange-400 text-white' },
  { value: 'completed',   label: 'Completed',    dot: 'bg-primary-500',pill: 'bg-primary-500 text-white' },
]

const getStatusCfg = (val) =>
  STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0]

// Task completion % → color
const taskColor = (pct) => {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 60)  return 'bg-blue-500'
  if (pct >= 30)  return 'bg-yellow-500'
  return 'bg-red-400'
}

// ── Status Dropdown Cell ──────────────────────────────────────────────────────
const StatusDropdown = ({ projectId, currentStatus, onUpdated, readOnly = false }) => {
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const ref = useRef(null)
  const cfg = getStatusCfg(currentStatus)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (val) => {
    if (val === currentStatus) { setOpen(false); return }
    setSaving(true)
    try {
      const res = await api.put(`/projects/${projectId}`, { status: val })
      if (res.success) {
        onUpdated(projectId, val)
        toast.success('Status updated')
      } else {
        toast.error(res.message || 'Failed to update')
      }
    } catch { toast.error('Cannot connect') }
    setSaving(false)
    setOpen(false)
  }

  if (readOnly) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.pill}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
        {cfg.label}
      </span>
    )
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all hover:opacity-90 active:scale-95 ${cfg.pill}`}
      >
        {saving ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
            className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0" />
        )}
        {cfg.label}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
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
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 text-left ${
                  opt.value === currentStatus ? 'bg-primary-500/5 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                {opt.label}
                {opt.value === currentStatus && (
                  <CheckCircle size={11} className="ml-auto text-primary-500" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Task mini bar cell ────────────────────────────────────────────────────────
const TaskCell = ({ done, total }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const color = taskColor(pct)
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      {/* Done / total count */}
      <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
        <span className="text-green-600 font-bold">{done}</span>
        <span className="text-gray-300 dark:text-dark-500">/</span>
        <span>{total}</span>
      </div>
      {/* Mini progress bar */}
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden min-w-[36px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      {/* % */}
      <span className={`text-[10px] font-bold ${color.replace('bg-', 'text-')}`}>{pct}%</span>
    </div>
  )
}

// ── Desktop Table Row ─────────────────────────────────────────────────────────
const TableRow = ({ project, index, onStatusUpdated, empCode }) => {
  const days    = daysLeft(project.deadline || project.end_date)
  const pct     = project.completion_percent || 0
  const isOverdue = days !== null && days < 0 && project.status !== 'completed'
  const isDueSoon = days !== null && days >= 0 && days <= 7
  const projId  = `${empCode || 'RU'}-${project.id}`

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="hover:bg-gray-50/80 dark:hover:bg-dark-700/50 transition-colors group border-b border-gray-100 dark:border-dark-600 last:border-0"
    >
      {/* ID */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono font-semibold text-primary-500">{projId}</span>
      </td>

      {/* Project Name */}
      <td className="px-4 py-3 min-w-[160px]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={11} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[150px] group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {project.name}
            </p>
            {project.description && (
              <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{project.description}</p>
            )}
          </div>
        </div>
      </td>

      {/* % Completion */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="w-14 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, delay: index * 0.04 }}
              className={`h-full rounded-full ${taskColor(pct)}`}
            />
          </div>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{pct}%</span>
        </div>
      </td>

      {/* Team members */}
      <td className="px-4 py-3 whitespace-nowrap">
        {project.members?.length ? (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {project.members.slice(0, 4).map((m, i) => {
                const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
                return (
                  <div key={i} title={name}
                    className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-dark-800 bg-primary-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt={name} className="w-full h-full object-cover" />
                      : <span className="text-[9px] font-bold text-white">{name.charAt(0)}</span>
                    }
                  </div>
                )
              })}
              {project.members.length > 4 && (
                <div className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-dark-800 bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">
                  +{project.members.length - 4}
                </div>
              )}
            </div>
            <span className="text-[10px] text-gray-400 ml-1">{project.members.length}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>

      {/* Status — clickable */}
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusDropdown
          projectId={project.id}
          currentStatus={project.status}
          onUpdated={onStatusUpdated}
        />
      </td>

      {/* Tasks */}
      <td className="px-4 py-3 whitespace-nowrap">
        <TaskCell done={project.done_count || 0} total={project.task_count || 0} />
      </td>

      {/* Start Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-gray-500 dark:text-gray-400">{fmtDate(project.start_date)}</span>
      </td>

      {/* End Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        {(project.deadline || project.end_date) ? (
          <div className="flex flex-col">
            <span className={`text-xs font-medium ${
              isOverdue ? 'text-red-500 font-bold' : isDueSoon ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {fmtDate(project.deadline || project.end_date)}
            </span>
            {days !== null && project.status !== 'completed' && (
              <span className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400' : isDueSoon ? 'text-orange-400' : 'text-gray-400'}`}>
                {isOverdue
                  ? `${Math.abs(days)}d overdue`
                  : days === 0 ? 'Due today'
                  : `${days}d left`}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>
    </motion.tr>
  )
}

// ── Mobile Project Card ───────────────────────────────────────────────────────
const MobileCard = ({ project, index, onStatusUpdated, empCode }) => {
  const days      = daysLeft(project.deadline || project.end_date)
  const pct       = project.completion_percent || 0
  const isOverdue = days !== null && days < 0 && project.status !== 'completed'
  const isDueSoon = days !== null && days >= 0 && days <= 7
  const projId    = `${empCode || 'RU'}-${project.id}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 120, damping: 14 }}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={14} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-mono text-primary-500 font-semibold">{projId}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{project.name}</p>
          </div>
        </div>
        {/* Status dropdown */}
        <StatusDropdown
          projectId={project.id}
          currentStatus={project.status}
          onUpdated={onStatusUpdated}
        />
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-gray-400 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 font-medium">Progress</span>
          <span className={`font-bold ${taskColor(pct).replace('bg-', 'text-')}`}>{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7 }}
            className={`h-full rounded-full ${taskColor(pct)}`}
          />
        </div>
      </div>

      {/* Tasks row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <CheckCircle size={12} className="text-green-500" />
          <span>Tasks:</span>
          <TaskCell done={project.done_count || 0} total={project.task_count || 0} />
        </div>
      </div>

      {/* Team */}
      {project.members?.length > 0 && (
        <div className="flex items-center gap-2">
          <Users size={12} className="text-gray-400 flex-shrink-0" />
          <div className="flex -space-x-1.5">
            {project.members.slice(0, 5).map((m, i) => {
              const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
              return (
                <div key={i} title={name}
                  className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-dark-800 bg-primary-500 flex items-center justify-center overflow-hidden">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={name} className="w-full h-full object-cover" />
                    : <span className="text-[9px] font-bold text-white">{name.charAt(0)}</span>
                  }
                </div>
              )
            })}
          </div>
          <span className="text-xs text-gray-400">{project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Dates */}
      <div className="flex gap-4 text-xs pt-1 border-t border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Calendar size={11} />
          <span>Start: {fmtDate(project.start_date)}</span>
        </div>
        <div className={`flex items-center gap-1 font-medium ${
          isOverdue ? 'text-red-500' : isDueSoon ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
        }`}>
          <Clock size={11} />
          <span>
            Due: {fmtDate(project.deadline || project.end_date)}
            {days !== null && project.status !== 'completed' && (
              <span className="ml-1 text-[10px] opacity-80">
                ({isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `${days}d left`})
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeProjects = () => {
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')

  // Derive employee code from first project's ID prefix (fallback 'EMP')
  const empCode = 'RU'

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/projects/my')
      if (res.success) setProjects(res.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  // Live status update (no reload needed)
  const handleStatusUpdated = (projectId, newStatus) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
  }

  // Stats
  const total   = projects.length
  const active  = projects.filter(p => p.status === 'in_progress').length
  const done    = projects.filter(p => p.status === 'completed').length
  const overdue = projects.filter(p => {
    const d = p.deadline || p.end_date
    return d && new Date(d) < new Date() && p.status !== 'completed'
  }).length

  // Filter + search
  const STATUS_FILTERS = [
    { key: 'all',        label: 'All Projects' },
    { key: 'in_progress',label: 'Active' },
    { key: 'planning',   label: 'Planning' },
    { key: 'review',     label: 'On Track' },
    { key: 'on_hold',    label: 'Delayed' },
    { key: 'completed',  label: 'Completed' },
  ]

  const filtered = projects.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter
    const matchSearch = !search ||
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const TABLE_COLS = ['ID', 'Project Name', '%', 'Owner / Team', 'Status', 'Tasks', 'Start Date', 'End Date']

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">My Projects</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Projects you are assigned to
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
          <motion.div animate={refreshing ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={13} />
          </motion.div>
          Refresh
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total"     value={loading ? '—' : total}   subtitle="Assigned to me"  color="primary" delay={0.1} />
        <StatCard title="Active"    value={loading ? '—' : active}  subtitle="In progress"     color="green"   delay={0.2} icon={TrendingUp} />
        <StatCard title="Completed" value={loading ? '—' : done}    subtitle="Finished"        color="blue"    delay={0.3} icon={CheckCircle} />
        <StatCard title="Overdue"   value={loading ? '—' : overdue} subtitle="Past deadline"   color="red"     delay={0.4} icon={AlertCircle} />
      </motion.div>

      {/* Search + Filter row */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

        {/* Filter dropdown label */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
          <FolderOpen size={13} className="text-primary-500" />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-transparent outline-none text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            {STATUS_FILTERS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="text-gray-400" />
        </div>

        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <span className="text-xs text-gray-400 flex-shrink-0">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
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
            <FolderOpen size={26} className="text-primary-500" />
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {search || filter !== 'all' ? 'No matching projects' : 'No projects assigned yet'}
          </h3>
          <p className="text-sm text-gray-400">
            {search || filter !== 'all'
              ? 'Try changing the filter or search'
              : 'Your Project Manager will assign you to projects soon'
            }
          </p>
        </motion.div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="hidden sm:block bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 800 }}>
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-700 border-b border-gray-100 dark:border-dark-600">
                    {TABLE_COLS.map(col => (
                      <th key={col}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project, i) => (
                    <TableRow
                      key={project.id}
                      project={project}
                      index={i}
                      onStatusUpdated={handleStatusUpdated}
                      empCode={empCode}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600 text-xs text-gray-400">
              Showing {filtered.length} of {projects.length} projects
            </div>
          </motion.div>

          {/* ── Mobile Cards ── */}
          <div className="sm:hidden space-y-3">
            {filtered.map((project, i) => (
              <MobileCard
                key={project.id}
                project={project}
                index={i}
                onStatusUpdated={handleStatusUpdated}
                empCode={empCode}
              />
            ))}
            <p className="text-xs text-gray-400 text-center pt-1">
              {filtered.length} of {projects.length} projects
            </p>
          </div>
        </>
      )}

    </div>
  )
}

export default EmployeeProjects
