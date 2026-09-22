import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertCircle, FolderOpen, Calendar
} from 'lucide-react'
import { api } from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const daysLeft = (d) => {
  if (!d) return null
  return Math.ceil((new Date(d) - new Date()) / 86400000)
}

// Completion % → color
const pctColor = (pct) => {
  if (pct >= 100) return { bar: 'bg-green-500',  text: 'text-green-600 dark:text-green-400' }
  if (pct >= 60)  return { bar: 'bg-blue-500',   text: 'text-blue-600 dark:text-blue-400' }
  if (pct >= 30)  return { bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' }
  return           { bar: 'bg-red-400',    text: 'text-red-500 dark:text-red-400' }
}

const STATUS_LABEL = {
  todo:          { label: 'Open',         cls: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-400' },
  in_progress:   { label: 'In Progress',  cls: 'bg-blue-500 text-white' },
  review:        { label: 'In Review',    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  to_be_tested:  { label: 'To be Tested', cls: 'bg-yellow-400 text-white' },
  done:          { label: 'Closed',       cls: 'bg-green-500 text-white' },
}

const PRIORITY_CLS = {
  low:    'bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  high:   'bg-orange-400 text-white',
  urgent: 'bg-red-500 text-white',
}

// ── Circular progress ring ────────────────────────────────────────────────────
const RingProgress = ({ pct, size = 52 }) => {
  const c   = pctColor(pct)
  const r   = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          className="text-gray-100 dark:text-dark-600" stroke="currentColor" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={pct >= 100 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 30 ? '#f59e0b' : '#f87171'}
          strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[11px] font-bold ${c.text}`}>{pct}%</span>
      </div>
    </div>
  )
}

// ── Employee Row ──────────────────────────────────────────────────────────────
const EmployeeRow = ({ emp, index }) => {
  const [expanded, setExpanded] = useState(false)
  const c = pctColor(emp.avg_completion)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 130, damping: 14 }}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors text-left"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          {emp.avatar_url
            ? <img src={emp.avatar_url} alt={emp.employee_name} className="w-full h-full object-cover" />
            : emp.employee_name?.charAt(0)?.toUpperCase() || '?'
          }
        </div>

        {/* Name + task count */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{emp.employee_name}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {emp.done_tasks}/{emp.total_tasks} tasks done
            </span>
            {emp.overdue_tasks > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                <AlertCircle size={10} /> {emp.overdue_tasks} overdue
              </span>
            )}
          </div>
        </div>

        {/* Overall progress bar — desktop */}
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0 w-48">
          <div className="flex-1 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${emp.avg_completion}%` }}
              transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
              className={`h-full rounded-full ${c.bar}`}
            />
          </div>
          <span className={`text-xs font-bold w-10 text-right flex-shrink-0 ${c.text}`}>
            {emp.avg_completion}%
          </span>
        </div>

        {/* Ring — mobile */}
        <div className="sm:hidden flex-shrink-0">
          <RingProgress pct={emp.avg_completion} size={44} />
        </div>

        {/* Expand icon */}
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-gray-400">
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Task list — expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-dark-600">

              {/* Desktop table header */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 dark:bg-dark-700 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                <span>Task Name</span>
                <span>Project</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Completion</span>
                <span>Due Date</span>
              </div>

              {emp.tasks.map((task, ti) => {
                const days      = daysLeft(task.due_date)
                const isOverdue = days !== null && days < 0 && task.status !== 'done'
                const tc        = pctColor(task.completion_percent)
                const stCfg     = STATUS_LABEL[task.status] || STATUS_LABEL.todo

                return (
                  <div key={task.id}
                    className={`px-4 py-3 border-b border-gray-50 dark:border-dark-700 last:border-0 ${
                      isOverdue ? 'bg-red-50/40 dark:bg-red-900/5' : ''
                    }`}
                  >
                    {/* Mobile layout */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-tight flex-1 ${
                          task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'
                        }`}>{task.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${stCfg.cls}`}>
                          {stCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                        {task.project_name && (
                          <span className="flex items-center gap-1">
                            <FolderOpen size={10} className="text-primary-400" />{task.project_name}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${PRIORITY_CLS[task.priority] || PRIORITY_CLS.medium}`}>
                          {task.priority}
                        </span>
                        <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-500' : ''}`}>
                          <Calendar size={10} />{fmtDate(task.due_date)}
                          {isOverdue && ` (${Math.abs(days)}d overdue)`}
                        </span>
                      </div>
                      {/* Progress */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${tc.bar}`}
                            style={{ width: `${task.completion_percent}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold flex-shrink-0 ${tc.text}`}>
                          {task.completion_percent}%
                        </span>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center">
                      {/* Task name */}
                      <p className={`text-sm font-medium truncate ${
                        task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'
                      }`}>{task.title}</p>

                      {/* Project */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                        {task.project_name
                          ? <><FolderOpen size={10} className="text-primary-400 flex-shrink-0" /><span className="truncate">{task.project_name}</span></>
                          : <span className="text-gray-300 dark:text-dark-500">—</span>
                        }
                      </div>

                      {/* Status */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block w-fit ${stCfg.cls}`}>
                        {stCfg.label}
                      </span>

                      {/* Priority */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize inline-block w-fit ${PRIORITY_CLS[task.priority] || PRIORITY_CLS.medium}`}>
                        {task.priority}
                      </span>

                      {/* Completion bar */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden min-w-[40px]">
                          <div className={`h-full rounded-full ${tc.bar}`}
                            style={{ width: `${task.completion_percent}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold flex-shrink-0 ${tc.text}`}>
                          {task.completion_percent}%
                        </span>
                      </div>

                      {/* Due date */}
                      <div>
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>
                          {fmtDate(task.due_date)}
                        </span>
                        {days !== null && task.status !== 'done' && task.due_date && (
                          <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                            {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Employee summary footer */}
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-700/60 flex items-center justify-between text-xs text-gray-400">
                <span>{emp.total_tasks} total · {emp.done_tasks} closed</span>
                <div className="flex items-center gap-1.5">
                  <span>Overall:</span>
                  <span className={`font-bold text-sm ${c.text}`}>{emp.avg_completion}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PMProjectUpdates = () => {
  const [data,       setData]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [lastUpdated,setLastUpdated]= useState(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/tasks/team-updates')
      if (res.success) {
        setData(res.data || [])
        setLastUpdated(new Date())
      } else setData([])
    } catch { setData([]) }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    load()
    // Auto-refresh every 30 seconds — 24/7 real-time updates
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [])

  // Overall team stats
  const totalEmps  = data.length
  const totalTasks = data.reduce((s, e) => s + e.total_tasks, 0)
  const doneTasks  = data.reduce((s, e) => s + e.done_tasks, 0)
  const overallPct = totalTasks
    ? Math.round(data.reduce((s, e) => s + (e.avg_completion * e.total_tasks), 0) / totalTasks)
    : 0
  const overdueEmps = data.filter(e => e.overdue_tasks > 0).length

  const filtered = data.filter(e =>
    !search || e.employee_name.toLowerCase().includes(search.toLowerCase())
  )

  const overall = pctColor(overallPct)

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Project Updates</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time task completion tracking · Auto-refreshes every 30s
            {lastUpdated && (
              <span className="ml-2 text-gray-400">
                · Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
          <motion.div animate={refreshing ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
            <RefreshCw size={13} />
          </motion.div>
          Refresh
          {/* Live indicator */}
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Auto-refreshes every 30s" />
        </button>
      </motion.div>

      {/* Team summary strip */}
      {!loading && data.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Overall ring */}
            <RingProgress pct={overallPct} size={64} />

            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">Team Overall Completion</p>
              <div className="h-3 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full rounded-full ${overall.bar}`} />
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-5 flex-wrap text-center">
              {[
                { label: 'Employees',  val: totalEmps,  color: 'text-primary-500' },
                { label: 'Total Tasks', val: totalTasks, color: 'text-gray-700 dark:text-gray-200' },
                { label: 'Done',        val: doneTasks,  color: 'text-green-500' },
                { label: 'Overdue',     val: overdueEmps > 0 ? `${overdueEmps} emp` : '—', color: overdueEmps > 0 ? 'text-red-500' : 'text-gray-400' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative">
          <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </motion.div>

      {/* Employee list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <Users size={26} className="text-primary-500" />
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
            {search ? 'No matching employees' : 'No task updates yet'}
          </h3>
          <p className="text-sm text-gray-400">
            {search ? 'Try a different name' : 'Assign tasks from the Reports page to see updates here'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp, i) => (
            <EmployeeRow key={emp.employee_id} emp={emp} index={i} />
          ))}
          <p className="text-xs text-gray-400 text-center pt-1">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''} · {totalTasks} tasks total
          </p>
        </div>
      )}
    </div>
  )
}

export default PMProjectUpdates
