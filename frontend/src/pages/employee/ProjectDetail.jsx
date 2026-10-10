// ProjectDetail.jsx — Employee view of a single project
// Tabs: Tasks (status update + completion), Overview (progress), Chat (PM ↔ Employee)
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, FolderOpen, Users, Calendar, ListTodo,
  BarChart2, MessageSquare, CheckCircle2, Circle,
  Loader2, Clock, RefreshCw, Send, Paperclip, X,
  TrendingUp, AlertCircle, ChevronRight,
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api, resolveFileUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const fmtDateTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
}

const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const statusCfg = (s) => ({
  todo:        { label: 'Pending',     dot: 'bg-gray-400',   pill: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-300' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500',   pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  review:      { label: 'Review',      dot: 'bg-yellow-400', pill: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' },
  done:        { label: 'Completed',   dot: 'bg-green-500',  pill: 'bg-green-500/10 text-green-600 dark:text-green-400' },
}[s] || { label: s, dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-500' })

const priorityCfg = (p) => ({
  low:    'text-green-500',
  medium: 'text-yellow-500',
  high:   'text-orange-500',
  urgent: 'text-red-500',
}[p] || 'text-gray-400')

// ── Read Tick ─────────────────────────────────────────────────────────────────
const ReadTick = ({ isRead }) => (
  <span className="inline-flex items-center">
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ marginLeft: '-5px' }}>
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
)

// ── Tasks Tab ─────────────────────────────────────────────────────────────────
const TasksTab = ({ tasks, onTaskUpdate }) => {
  const [updating, setUpdating] = useState(null) // taskId

  const handleStatusChange = async (task, newStatus) => {
    if (updating) return
    setUpdating(task.id)
    try {
      const pct = newStatus === 'done' ? 100 : newStatus === 'in_progress' ? 50 : task.completion_percent || 0
      const res = await api.patch(`/tasks/${task.id}/status`, { status: newStatus, completion_percent: pct })
      if (res.success) {
        onTaskUpdate(task.id, { status: newStatus, completion_percent: pct })
        toast.success('Task updated')
      } else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect') }
    setUpdating(null)
  }

  const handlePctChange = async (task, pct) => {
    if (updating) return
    setUpdating(task.id)
    try {
      const res = await api.patch(`/tasks/${task.id}/completion`, { completion_percent: pct })
      if (res.success) {
        onTaskUpdate(task.id, { completion_percent: pct })
      }
    } catch {}
    setUpdating(null)
  }

  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
        <ListTodo size={28} className="text-primary-400" />
      </div>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks assigned yet</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {tasks.map((task, i) => {
        const st  = statusCfg(task.status)
        const pct = task.completion_percent || 0
        const isUpdating = updating === task.id
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

        return (
          <motion.div key={task.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* Status icon */}
              <button
                onClick={() => {
                  const next = { todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo' }
                  handleStatusChange(task, next[task.status] || 'todo')
                }}
                disabled={isUpdating}
                className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                title="Click to advance status"
              >
                {isUpdating
                  ? <Loader2 size={18} className="text-primary-500 animate-spin" />
                  : task.status === 'done'
                    ? <CheckCircle2 size={18} className="text-green-500" />
                    : task.status === 'in_progress'
                      ? <Loader2 size={18} className="text-blue-500" />
                      : <Circle size={18} className="text-gray-400" />
                }
              </button>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className={`text-sm font-semibold leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs font-semibold ${priorityCfg(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${st.pill}`}>
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                )}

                {/* Progress slider */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Completion</span>
                    <span className={`font-bold ${pct >= 100 ? 'text-green-500' : pct >= 50 ? 'text-blue-500' : 'text-gray-500'}`}>{pct}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={pct}
                    onChange={e => onTaskUpdate(task.id, { completion_percent: parseInt(e.target.value) })}
                    onMouseUp={e => handlePctChange(task, parseInt(e.target.value))}
                    onTouchEnd={e => handlePctChange(task, parseInt(e.target.value))}
                    disabled={isUpdating || task.status === 'done'}
                    className="w-full h-1.5 rounded-full accent-primary-500 cursor-pointer disabled:opacity-40"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  {task.due_date && (
                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                      <Calendar size={10} />
                      {isOverdue ? 'Overdue: ' : 'Due: '}
                      {fmtDate(task.due_date)}
                    </span>
                  )}
                  {/* Status quick-change */}
                  <div className="ml-auto flex items-center gap-1">
                    {['todo','in_progress','review','done'].map(s => (
                      <button key={s}
                        onClick={() => handleStatusChange(task, s)}
                        disabled={isUpdating || task.status === s}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          task.status === s
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-dark-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-dark-600'
                        }`}
                      >
                        {statusCfg(s).label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab = ({ project, tasks }) => {
  const done       = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const review     = tasks.filter(t => t.status === 'review').length
  const todo       = tasks.filter(t => t.status === 'todo').length
  const total      = tasks.length
  const pct        = total > 0 ? Math.round((done / total) * 100) : (project.completion_percent || 0)
  const overdue    = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length

  return (
    <div className="space-y-5">
      {/* Progress card */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary-500" /> Overall Progress
          </p>
          <span className="text-lg font-bold text-primary-500">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: pct + '%' }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
          />
        </div>
        {/* Status breakdown */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Pending',     count: todo,       color: 'bg-gray-400' },
            { label: 'In Progress', count: inProgress, color: 'bg-blue-500' },
            { label: 'Review',      count: review,     color: 'bg-yellow-400' },
            { label: 'Done',        count: done,        color: 'bg-green-500' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`w-2.5 h-2.5 rounded-full ${s.color} mx-auto mb-1`} />
              <p className="text-[10px] text-gray-400">{s.label}</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{s.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks',  value: total,       icon: ListTodo,     bg: 'bg-indigo-500' },
          { label: 'Completed',    value: done,         icon: CheckCircle2, bg: 'bg-green-500'  },
          { label: 'In Progress',  value: inProgress,  icon: Loader2,      bg: 'bg-blue-500'   },
          { label: 'Overdue',      value: overdue,     icon: AlertCircle,  bg: 'bg-red-500'    },
        ].map((c, i) => (
          <motion.div key={c.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-4 shadow-sm flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
              <c.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium">{c.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{c.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Project info */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <FolderOpen size={14} className="text-primary-500" /> Project Info
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Status',     value: project.status?.replace('_', ' ') || '—' },
            { label: 'Priority',   value: <span className={priorityCfg(project.priority) + ' font-semibold capitalize'}>{project.priority || '—'}</span> },
            { label: 'Start Date', value: fmtDate(project.start_date) },
            { label: 'End Date',   value: fmtDate(project.deadline || project.end_date) },
            { label: 'Team Size',  value: (project.members?.length || 0) + ' members' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-dark-700 last:border-0">
              <span className="text-xs text-gray-400">{row.label}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
const ChatTab = ({ tasks, employeeId, currentUser }) => {
  const [selectedTask, setSelectedTask] = useState(null)
  const [comments,     setComments]     = useState([])
  const [loadingCmts,  setLoadingCmts]  = useState(false)
  const [message,      setMessage]      = useState('')
  const [sending,      setSending]      = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)

  const chatBottomRef = useRef(null)
  const fileInputRef  = useRef(null)

  const loadComments = useCallback(async (taskId, silent = false) => {
    if (!silent) setLoadingCmts(true)
    try {
      const res = await api.get(`/tasks/${taskId}/comments`)
      if (res.success) setComments(res.data || [])
      // Mark as read
      await api.patch(`/tasks/${taskId}/comments/read`)
    } catch {}
    setLoadingCmts(false)
  }, [])

  const selectTask = (task) => {
    setSelectedTask(task)
    setComments([])
    loadComments(task.id)
  }

  useEffect(() => {
    if (tasks.length > 0 && !selectedTask) selectTask(tasks[0])
  }, [tasks]) // eslint-disable-line

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // Poll every 10s
  useEffect(() => {
    if (!selectedTask) return
    const t = setInterval(() => loadComments(selectedTask.id, true), 10000)
    return () => clearInterval(t)
  }, [selectedTask, loadComments])

  const handleSend = async () => {
    if (!message.trim() && !attachedFile) return
    if (!selectedTask) return
    setSending(true)
    try {
      let res
      if (attachedFile) {
        const fd = new FormData()
        fd.append('content', message.trim() || attachedFile.name)
        fd.append('attachment', attachedFile)
        res = await api.upload(`/tasks/${selectedTask.id}/comments`, fd)
      } else {
        res = await api.post(`/tasks/${selectedTask.id}/comments`, { content: message.trim() })
      }
      if (res.success) {
        setMessage('')
        setAttachedFile(null)
        await loadComments(selectedTask.id, true)
      } else toast.error(res.message || 'Failed to send')
    } catch { toast.error('Cannot connect') }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isMe = (comment) => {
    // Primary: match by employee DB id
    if (employeeId && comment.author_id && Number(comment.author_id) === Number(employeeId)) return true
    // Fallback: author_id is set (non-null) means it's an employee message — PM messages have author_id = null
    // So if author_id is NOT null, it's an employee message → show on right side
    if (comment.author_id !== null && comment.author_id !== undefined && comment.author_id !== '') {
      // If we have employeeId, only match our own; otherwise show all employee messages on right
      if (employeeId) return Number(comment.author_id) === Number(employeeId)
      return true // employeeId not resolved yet, assume it's mine
    }
    return false // author_id = null means PM message → show on left
  }

  return (
    <div className="flex gap-4 h-[60vh] min-h-[400px]">
      {/* Task list (left) */}
      <div className="w-56 flex-shrink-0 flex flex-col bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 overflow-hidden shadow-sm">
        <div className="px-3 py-3 border-b border-gray-100 dark:border-dark-600">
          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Tasks</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tasks.map(t => (
            <button key={t.id} onClick={() => selectTask(t)}
              className={`w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-dark-700 transition-colors last:border-0 ${
                selectedTask?.id === t.id
                  ? 'bg-primary-500/10 border-l-2 border-l-primary-500'
                  : 'hover:bg-gray-50 dark:hover:bg-dark-700'
              }`}
            >
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{t.title}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${statusCfg(t.status).pill}`}>
                {statusCfg(t.status).label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel (right) */}
      <div className="flex-1 flex flex-col bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
        {/* Header */}
        {selectedTask && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-600 flex items-center gap-3">
            <MessageSquare size={14} className="text-primary-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{selectedTask.title}</p>
              <p className="text-[10px] text-gray-400">Task chat with Project Manager</p>
            </div>
            <button onClick={() => loadComments(selectedTask.id, true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors">
              <RefreshCw size={12} />
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {loadingCmts ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <MessageSquare size={28} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment, i) => {
              const mine = isMe(comment)
              return (
                <motion.div key={comment.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!mine && (
                    <Avatar name={comment.author_name || 'PM'} src={comment.avatar_url} size="xs" animate={false} />
                  )}
                  <div className={`max-w-[70%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                    {!mine && (
                      <span className="text-[10px] text-gray-400 font-medium mb-1 ml-1">{comment.author_name || 'Project Manager'}</span>
                    )}
                    {(comment.file_url || comment.file_data) && (() => {
                      const absUrl = comment.file_data || resolveFileUrl(comment.file_url)
                      if (!absUrl) return (
                        <div className="mb-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-gray-600/30 text-gray-500">
                          <Paperclip size={10}/><span className="truncate">{comment.file_name}</span>
                          <span className="ml-auto text-[10px]">Unavailable</span>
                        </div>
                      )
                      const isImage = comment.file_type?.startsWith('image/')
                      const isVideo = comment.file_type?.startsWith('video/')
                      const doDownload = (e) => {
                        e.preventDefault()
                        const a = document.createElement('a')
                        a.href = absUrl; a.download = comment.file_name || 'attachment'
                        document.body.appendChild(a); a.click(); document.body.removeChild(a)
                      }
                      return (
                        <div className="mb-1">
                          {isImage ? (
                            <div className="space-y-0.5">
                              <img src={absUrl} alt={comment.file_name} onClick={doDownload}
                                className="max-w-[200px] rounded-xl cursor-pointer hover:opacity-90 border border-white/10" />
                              <p className={`text-[10px] ${mine ? 'text-white/60' : 'text-gray-400'}`}>Tap to download</p>
                            </div>
                          ) : isVideo ? (
                            <div className="space-y-1">
                              <video src={absUrl} controls className="max-w-[220px] rounded-xl border border-white/10" style={{ maxHeight: 140 }} />
                              <button onClick={doDownload}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] w-full justify-center ${mine ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'}`}>
                                ⬇ Download video
                              </button>
                            </div>
                          ) : (
                            <button onClick={doDownload}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full text-left ${mine ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-700 hover:bg-gray-50'}`}>
                              <span className="text-xl">
                                {comment.file_name?.match(/\.pdf$/i) ? '📄' : comment.file_name?.match(/\.(xlsx?|csv)$/i) ? '📊'
                                  : comment.file_name?.match(/\.(zip|rar|7z)$/i) ? '🗜️' : comment.file_name?.match(/\.(docx?)$/i) ? '📝' : '📎'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-semibold truncate ${mine ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{comment.file_name || 'Attachment'}</p>
                                <p className={`text-[9px] ${mine ? 'text-white/60' : 'text-gray-400'}`}>
                                  {comment.file_size_kb ? comment.file_size_kb >= 1024 ? `${(comment.file_size_kb/1024).toFixed(1)} MB` : `${comment.file_size_kb} KB` : ''} · Tap to download
                                </p>
                              </div>
                              <span className={`text-base ${mine ? 'text-white/80' : 'text-gray-400'}`}>⬇</span>
                            </button>
                          )}
                        </div>
                      )
                    })()}
                    {comment.content && (
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        mine
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                      }`}>
                        {comment.content}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-gray-400">{fmtTime(comment.created_at)}</span>
                      {mine && <ReadTick isRead={!!comment.is_read} />}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* File preview */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500/8 border border-primary-500/20 text-xs">
              <Paperclip size={11} className="text-primary-500 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                <X size={11} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-dark-600">
          <div className="flex items-end gap-2 bg-gray-50 dark:bg-dark-700 rounded-2xl border border-gray-200 dark:border-dark-600 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary-500/30 transition-all">
            <button onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded-lg text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0">
              <Paperclip size={15} />
            </button>
            <input ref={fileInputRef} type="file" className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f && f.size <= 10 * 1024 * 1024) setAttachedFile(f)
                else if (f) toast.error('File too large (max 10MB)')
                e.target.value = ''
              }} />
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none resize-none max-h-[80px] overflow-y-auto"
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px' }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={sending || (!message.trim() && !attachedFile)}
              className="p-2 rounded-xl bg-primary-500 text-white disabled:opacity-40 flex-shrink-0"
            >
              {sending
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : <Send size={15} />
              }
            </motion.button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-center">
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-dark-600 text-[9px] font-mono">Enter</kbd> to send ·
            <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-dark-600 text-[9px] font-mono ml-1">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'tasks',    label: 'Tasks',    icon: ListTodo     },
  { id: 'overview', label: 'Overview', icon: BarChart2    },
  { id: 'chat',     label: 'Chat',     icon: MessageSquare },
]

const EmployeeProjectDetail = () => {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tab,        setTab]        = useState('tasks')
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [employeeId, setEmployeeId] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      // First fetch employee id if not set
      let empId = employeeId
      if (!empId) {
        const meRes = await api.get('/auth/me')
        if (meRes.success && meRes.data?.employee?.id) {
          empId = meRes.data.employee.id
          setEmployeeId(empId)
        } else if (user?.employee?.id) {
          empId = user.employee.id
          setEmployeeId(empId)
        }
      }

      const res = await api.get(`/projects/${id}`)
      if (res.success) {
        setData(res.data)
      } else {
        toast.error(res.message || 'Failed to load project')
        navigate('/employee/projects')
      }
    } catch {
      toast.error('Cannot connect')
      navigate('/employee/projects')
    }
    setLoading(false)
    setRefreshing(false)
  }, [id, navigate, user, employeeId])

  useEffect(() => { load() }, [load])

  const handleTaskUpdate = (taskId, updates) => {
    setData(prev => ({
      ...prev,
      tasks: (prev?.tasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t),
    }))
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  if (!data) return null

  const { project, tasks = [], memberStats = [] } = data

  // My tasks only (tasks assigned to me) — compare as integers
  const myTasks = employeeId
    ? tasks.filter(t => Number(t.assigned_to) === Number(employeeId))
    : tasks  // fallback: show all if employeeId not resolved yet

  const statusColors = {
    in_progress: 'bg-green-500/20 text-green-400 border border-green-500/30',
    planning:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    review:      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    on_hold:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    completed:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    cancelled:   'bg-red-500/20 text-red-400 border border-red-500/30',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Breadcrumb + header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/employee/projects')}
          className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <button onClick={() => navigate('/employee/projects')} className="hover:text-primary-500 transition-colors">My Projects</button>
            <ChevronRight size={12} />
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
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusColors[project.status] || statusColors.planning}`}>
                  {project.status?.replace('_', ' ')}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users size={11} /> {memberStats.length} Members
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={11} /> Started: {fmtDate(project.start_date)}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <ListTodo size={11} /> {myTasks.length} task{myTasks.length !== 1 ? 's' : ''} assigned to me
                </span>
              </div>
            </div>
            {/* Refresh */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => load(true)} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 text-white text-xs font-semibold shadow-md shadow-primary-500/25 disabled:opacity-60"
            >
              <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.7, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
                <RefreshCw size={13} />
              </motion.div>
              Refresh
            </motion.button>
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
            <t.icon size={13} />
            {t.label}
            {t.id === 'tasks' && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[10px] font-bold">
                {myTasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
          {tab === 'tasks'    && <TasksTab tasks={myTasks} onTaskUpdate={handleTaskUpdate} />}
          {tab === 'overview' && <OverviewTab project={project} tasks={tasks} />}
          {tab === 'chat'     && <ChatTab tasks={myTasks} employeeId={employeeId} currentUser={user} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default EmployeeProjectDetail
