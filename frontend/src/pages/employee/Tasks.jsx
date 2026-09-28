// Tasks.jsx — Employee Task Communication (Chat View)
// Left: task list  |  Right: chat thread for selected task
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Paperclip, Smile, Send, CheckCircle2,
  FolderOpen, Calendar, AlertTriangle, Clock, ChevronDown
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/common/Avatar'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_COLOR = {
  low:    'text-gray-400',
  medium: 'text-yellow-500',
  high:   'text-orange-500',
  urgent: 'text-red-500',
}

const PRIORITY_BADGE = {
  low:    'bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  high:   'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
}

const STATUS_MAP = {
  todo:        { label: 'Open',        pill: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-300',    dot: 'bg-gray-400' },
  in_progress: { label: 'In Progress', pill: 'bg-blue-500 text-white',                                           dot: 'bg-blue-500' },
  review:      { label: 'In Review',   pill: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300', dot: 'bg-purple-500' },
  done:        { label: 'Closed',      pill: 'bg-green-500 text-white',                                          dot: 'bg-green-500' },
}

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—'

const fmtTime = (d) => d
  ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
  : ''

const fmtDateTime = (d) => d
  ? `${new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${fmtTime(d)}`
  : ''

const daysLeft = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null
const taskCode = (t) => `E${(t.project_name || 'Z').slice(0,1).toUpperCase()}${String(t.id).padStart(2,'0').replace(/\d+/, n => n)}-TS${t.id}`

// ── Status Dropdown ───────────────────────────────────────────────────────────
const StatusDropdown = ({ taskId, currentStatus, onUpdated }) => {
  const [open,   setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)
  const cfg = STATUS_MAP[currentStatus] || STATUS_MAP.todo

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
        onUpdated(taskId, val)
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
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-90 ${cfg.pill}`}
      >
        {saving
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
              className="w-2.5 h-2.5 border-2 border-current/30 border-t-current rounded-full" />
          : <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        }
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
            {Object.entries(STATUS_MAP).map(([val, s]) => (
              <button key={val} onClick={() => handleSelect(val)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 text-left ${
                  val === currentStatus ? 'bg-primary-500/5 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                {s.label}
                {val === currentStatus && <CheckCircle2 size={11} className="ml-auto text-primary-500" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Task List Item ────────────────────────────────────────────────────────────
const TaskItem = ({ task, selected, onClick }) => {
  const cfg  = STATUS_MAP[task.status] || STATUS_MAP.todo
  const days = daysLeft(task.due_date)
  const isOverdue = days !== null && days < 0 && task.status !== 'done'
  const unread = parseInt(task.unread_count) || 0

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-dark-700 transition-all ${
        selected
          ? 'bg-primary-500/8 border-l-2 border-l-primary-500'
          : 'hover:bg-gray-50 dark:hover:bg-dark-700/40 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-sm font-semibold leading-tight flex-1 ${
          selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'
        }`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Unread message badge — WhatsApp green style */}
          {unread > 0 && !selected && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
            {task.priority}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className="text-[11px] text-gray-400">{cfg.label}</span>
        </div>
        {task.due_date && (
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
            <Calendar size={9} />
            {fmtDate(task.due_date)}
          </span>
        )}
      </div>

      {task.project_name && (
        <div className="flex items-center gap-1 mt-1">
          <FolderOpen size={10} className="text-primary-400 flex-shrink-0" />
          <span className="text-[10px] text-gray-400 truncate">{task.project_name}</span>
        </div>
      )}
    </motion.button>
  )
}

// ── Chat Message ──────────────────────────────────────────────────────────────
// ReadTick: single gray = sent, double blue = read (WhatsApp style)
const ReadTick = ({ isRead }) => (
  <span className="flex items-center" title={isRead ? 'Read' : 'Sent'}>
    {/* First tick */}
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {/* Second tick — offset left so they overlap like WhatsApp */}
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ marginLeft: '-5px' }}>
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
)

const ChatMessage = ({ msg, isMe }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
  >
    {!isMe && (
      <Avatar name={msg.author_name || 'PM'} src={msg.avatar_url} size="sm" />
    )}

    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
      {!isMe && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {msg.author_name || 'Project Manager'}
          </span>
          <span className="text-[10px] text-gray-400">{fmtDateTime(msg.created_at)}</span>
        </div>
      )}

      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isMe
          ? 'bg-primary-500 text-white rounded-br-sm'
          : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
      }`}>
        <p>{msg.content}</p>

        {/* System attachment badge (first PM message gets Task Assignment label) */}
        {msg._isFirstPM && (
          <div className={`mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
            isMe ? 'bg-white/20 text-white' : 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400'
          }`}>
            <Paperclip size={11} />
            Task Assignment
          </div>
        )}
      </div>

      {isMe && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{fmtDateTime(msg.created_at)}</span>
          <ReadTick isRead={!!msg.is_read} />
        </div>
      )}
    </div>

    {isMe && (
      <Avatar name={msg.author_name || 'Me'} src={msg.avatar_url} size="sm" />
    )}
  </motion.div>
)

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeTasks = () => {
  const { user } = useAuth()
  const [tasks,          setTasks]          = useState([])
  const [selectedTask,   setSelectedTask]   = useState(null)
  const [comments,       setComments]       = useState([])
  const [message,        setMessage]        = useState('')
  const [loadingTasks,   setLoadingTasks]   = useState(true)
  const [loadingComments,setLoadingComments]= useState(false)
  const [sending,        setSending]        = useState(false)
  const [accepting,      setAccepting]      = useState(false)
  const chatBottomRef = useRef(null)
  const textareaRef   = useRef(null)

  // ── Load tasks ───────────────────────────────────────────────────────────
  const loadTasks = async () => {
    setLoadingTasks(true)
    try {
      const now = new Date()
      const res = await api.get(`/tasks/my?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
      if (res.success) {
        setTasks(res.data || [])
        // Auto-select first task
        if (!selectedTask && res.data?.length > 0) {
          await selectTask(res.data[0])
        }
      }
    } catch {}
    setLoadingTasks(false)
  }

  // ── Load comments for a task ─────────────────────────────────────────────
  const loadComments = async (taskId) => {
    setLoadingComments(true)
    try {
      const res = await api.get(`/tasks/${taskId}/comments`)
      if (res.success) {
        const data = res.data || []
        if (data.length > 0) data[0]._isFirstPM = true
        setComments(data)
        // Mark all PM messages as read — triggers blue ticks on PM side
        api.patch(`/tasks/${taskId}/comments/read`, {}).catch(() => {})
      } else {
        setComments([])
      }
    } catch {
      setComments([])
    }
    setLoadingComments(false)
  }

  const selectTask = async (task) => {
    setSelectedTask(task)
    setComments([])
    setMessage('')
    // Instantly clear unread badge in the list (optimistic update)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, unread_count: 0 } : t))
    await loadComments(task.id)
  }

  useEffect(() => { loadTasks() }, [])

  // Scroll to bottom when comments change
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments])

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = message.trim()
    if (!content || !selectedTask) return
    setSending(true)
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/comments`, { content })
      if (res.success) {
        setMessage('')
        await loadComments(selectedTask.id)
      } else toast.error(res.message || 'Failed to send')
    } catch { toast.error('Cannot connect to server') }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Accept Task ──────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!selectedTask || selectedTask.status !== 'todo') return
    setAccepting(true)
    try {
      const res = await api.patch(`/tasks/${selectedTask.id}/status`, { status: 'in_progress' })
      if (res.success) {
        const updated = { ...selectedTask, status: 'in_progress' }
        setSelectedTask(updated)
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? updated : t))
        toast.success('Task accepted!')
        // Post an auto-message
        await api.post(`/tasks/${selectedTask.id}/comments`, {
          content: `Accepted. I've received the ${selectedTask.title} task and will proceed as discussed.`
        })
        await loadComments(selectedTask.id)
      } else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect to server') }
    setAccepting(false)
  }

  // ── Status updated from dropdown ─────────────────────────────────────────
  const handleStatusUpdated = (taskId, newStatus) => {
    const updated = { ...selectedTask, status: newStatus }
    setSelectedTask(updated)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
  }

  // Determine if a comment is from the current employee (me)
  // NULL author_id = posted by PM/HR (non-employee) → NOT "me" on employee side → left bubble
  const myEmployeeId = user?.employee?.id
  const isMyComment = (c) => {
    if (c._synthetic) return false
    if (c.author_id === null || c.author_id === undefined) return false  // PM message → left side
    if (!myEmployeeId) return false
    return String(c.author_id) === String(myEmployeeId)
  }

  // Build synthetic PM assignment message if no comments exist
  const displayComments = (() => {
    if (comments.length > 0) return comments
    if (!selectedTask) return []
    // Synthetic first message from PM
    return [{
      id:          'synthetic-0',
      author_id:   null,
      author_name: 'Project Manager',
      avatar_url:  selectedTask.assigned_by_avatar || null,
      content:     `${selectedTask.title} task assigned. Please review the requirements and proceed with the work.`,
      created_at:  selectedTask.created_at,
      _isFirstPM:  true,
      _synthetic:  true,
    }]
  })()

  const days = selectedTask ? daysLeft(selectedTask.due_date) : null
  const isOverdue = days !== null && days < 0 && selectedTask?.status !== 'done'
  const code = selectedTask ? taskCode(selectedTask) : ''

  // ── Mobile: show list or chat ────────────────────────────────────────────
  const [mobileView, setMobileView] = useState('list') // 'list' | 'chat'

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">

      {/* ── LEFT: Task List ─────────────────────────────────────────── */}
      <div className={`w-full sm:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-dark-600 ${
        mobileView === 'chat' ? 'hidden sm:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-600">
          <h1 className="text-base font-bold text-gray-900 dark:text-white">My Tasks</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned
          </p>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {loadingTasks ? (
            <div className="flex justify-center py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 size={24} className="text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No tasks yet</p>
              <p className="text-xs text-gray-400 mt-1">Tasks assigned by your Project Manager will appear here</p>
            </div>
          ) : (
            <AnimatePresence>
              {tasks.map((task, i) => (
                <motion.div key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <TaskItem
                    task={task}
                    selected={selectedTask?.id === task.id}
                    onClick={() => {
                      selectTask(task)
                      setMobileView('chat')
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Panel ───────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${
        mobileView === 'list' ? 'hidden sm:flex' : 'flex'
      }`}>
        {!selectedTask ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-gray-300 dark:text-dark-500" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a task to view communication</p>
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-dark-600 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {/* Mobile back */}
                <button
                  onClick={() => setMobileView('list')}
                  className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 flex-shrink-0 mt-0.5"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                      Task Communication
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 flex-wrap">
                    <span>My Tasks</span>
                    <span>›</span>
                    <span className="text-gray-600 dark:text-gray-300 font-medium">{selectedTask.title}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Task Info Card ── */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-dark-600 bg-gray-50/50 dark:bg-dark-700/30">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  {/* Task icon */}
                  <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-dark-600 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={16} className="text-gray-500 dark:text-gray-400" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedTask.title}</span>
                      <StatusDropdown
                        taskId={selectedTask.id}
                        currentStatus={selectedTask.status}
                        onUpdated={handleStatusUpdated}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="font-mono font-semibold text-primary-500">{code}</span>
                      </span>
                      {selectedTask.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Due Date
                          <span className={`font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                            {fmtDate(selectedTask.due_date)}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <AlertTriangle size={11} className={PRIORITY_COLOR[selectedTask.priority]} />
                        Priority
                        <span className={`font-semibold capitalize ${PRIORITY_COLOR[selectedTask.priority]}`}>
                          {selectedTask.priority}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accept Task button — only show if status is todo */}
                {selectedTask.status === 'todo' && (
                  <motion.button
                    onClick={handleAccept}
                    disabled={accepting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex-shrink-0"
                  >
                    {accepting
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      : <CheckCircle2 size={16} />
                    }
                    Accept Task
                  </motion.button>
                )}
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
              {loadingComments ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : (
                <AnimatePresence>
                  {displayComments.map((msg, i) => (
                    <ChatMessage
                      key={msg.id || i}
                      msg={msg}
                      isMe={!msg._synthetic && isMyComment(msg)}
                    />
                  ))}
                </AnimatePresence>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* ── Input Box ── */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-dark-600 bg-white dark:bg-dark-800">
              <div className="flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply…"
                  rows={2}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition-all"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Attach file (coming soon)" onClick={() => toast('File attachment coming soon')}>
                      <Paperclip size={16} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title="Emoji">
                      <Smile size={16} />
                    </button>
                  </div>

                  <motion.button
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-40 transition-all"
                  >
                    {sending
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      : <Send size={15} />
                    }
                    Send
                  </motion.button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EmployeeTasks
