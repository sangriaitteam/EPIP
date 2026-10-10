// Tasks.jsx — Employee Task Communication (Chat View)
// Left: task list  |  Right: chat thread for selected task
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Paperclip, Smile, Send, CheckCircle2,
  FolderOpen, Calendar, AlertTriangle, Clock, ChevronDown, Trash2
} from 'lucide-react'
import { api, resolveFileUrl } from '../../services/api'
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
const TaskItem = ({ task, selected, onClick, onDelete }) => {
  const cfg  = STATUS_MAP[task.status] || STATUS_MAP.todo
  const days = daysLeft(task.due_date)
  const isOverdue = days !== null && days < 0 && task.status !== 'done'
  const unread = parseInt(task.unread_count) || 0

  return (
    <div className="relative group">
      <motion.button
        onClick={onClick}
        whileHover={{ x: 2 }}
        className={`w-full text-left pl-4 pr-12 py-3.5 border-b border-gray-100 dark:border-dark-700 transition-all ${
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

      {/* Delete button — always visible, right side */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(task) }}
        className="absolute top-1/2 -translate-y-1/2 right-3 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-all z-10"
        title="Delete task"
      >
        <Trash2 size={14} />
      </button>
    </div>
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

        {/* File attachment */}
        {(msg.file_url || msg.file_data) && (() => {
          const absUrl = msg.file_data || resolveFileUrl(msg.file_url)
          if (!absUrl) return (
            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-600/30 text-gray-500 text-[11px]">
              <span>📎</span><span className="truncate">{msg.file_name}</span>
              <span className="ml-auto text-[10px]">Unavailable</span>
            </div>
          )

          const isImage = msg.file_type?.startsWith('image/')
          const isVideo = msg.file_type?.startsWith('video/')

          const doDownload = (e) => {
            e.stopPropagation()
            const a = document.createElement('a')
            a.href = absUrl; a.download = msg.file_name || 'attachment'
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
          }

          return (
            <div className="mt-2">
              {isImage ? (
                <div className="space-y-1">
                  <img src={absUrl} alt={msg.file_name} onClick={doDownload}
                    className="max-w-[220px] rounded-xl border border-white/20 cursor-pointer hover:opacity-90 mt-1" />
                  <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>Tap to download</p>
                </div>
              ) : isVideo ? (
                <div className="space-y-1.5">
                  <video src={absUrl} controls className="max-w-[240px] rounded-xl border border-white/20" style={{ maxHeight: 150 }} />
                  <button onClick={doDownload}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium w-full justify-center ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200'} transition-colors`}>
                    ⬇ Download video
                  </button>
                </div>
              ) : (
                <button onClick={doDownload}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border w-full text-left transition-colors mt-1 ${isMe ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 hover:bg-gray-50 dark:hover:bg-dark-500'}`}>
                  <span className="text-2xl flex-shrink-0">
                    {msg.file_name?.match(/\.pdf$/i) ? '📄' : msg.file_name?.match(/\.(xlsx?|csv)$/i) ? '📊'
                      : msg.file_name?.match(/\.(zip|rar|7z)$/i) ? '🗜️' : msg.file_name?.match(/\.(docx?)$/i) ? '📝' : '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                      {msg.file_name || 'Attachment'}
                    </p>
                    <p className={`text-[9px] mt-0.5 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                      {msg.file_size_kb ? msg.file_size_kb >= 1024 ? `${(msg.file_size_kb / 1024).toFixed(1)} MB` : `${msg.file_size_kb} KB` : ''} · Tap to download
                    </p>
                  </div>
                  <span className={`text-lg flex-shrink-0 ${isMe ? 'text-white/80' : 'text-gray-400'}`}>⬇</span>
                </button>
              )}
            </div>
          )
        })()}

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
  const [attachedFile,   setAttachedFile]   = useState(null)
  const chatBottomRef = useRef(null)
  const textareaRef   = useRef(null)
  const fileInputRef  = useRef(null)

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
    if (!content && !attachedFile) return
    if (!selectedTask) return
    setSending(true)
    try {
      let res
      if (attachedFile) {
        const fd = new FormData()
        if (content) fd.append('content', content)
        fd.append('attachment', attachedFile.file)
        // ── Use api.upload() — resolves correct BASE_URL (Railway/Vercel safe) ──
        res = await api.upload(`/tasks/${selectedTask.id}/comments`, fd)
      } else {
        res = await api.post(`/tasks/${selectedTask.id}/comments`, { content })
      }
      if (res.success) {
        setMessage('')
        setAttachedFile(null)
        await loadComments(selectedTask.id)
      } else toast.error(res.message || 'Failed to send')
    } catch { toast.error('Cannot connect to server') }
    setSending(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10 MB)'); return }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setAttachedFile({ file, preview, name: file.name, type: file.type, size: file.size })
    e.target.value = ''
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

  // ── Delete task ───────────────────────────────────────────────────────────
  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    try {
      const res = await api.delete(`/tasks/${task.id}`)
      if (res.success) {
        setTasks(prev => prev.filter(t => t.id !== task.id))
        if (selectedTask?.id === task.id) {
          setSelectedTask(null)
          setComments([])
        }
        toast.success('Task deleted')
      } else {
        toast.error(res.message || 'Failed to delete')
      }
    } catch { toast.error('Cannot connect to server') }
  }

  // Determine if a comment is from the current employee (me)
  // NULL author_id = PM/HR message → left bubble (not mine)
  // Non-null author_id = employee message → right bubble if it's mine
  const myEmployeeId = user?.employee?.id
  const isMyComment = (c) => {
    if (c._synthetic) return false
    // PM messages always have author_id = null → left side
    if (c.author_id === null || c.author_id === undefined) return false
    // If we know our employee ID, match exactly
    if (myEmployeeId) return String(c.author_id) === String(myEmployeeId)
    // Fallback: author_id is set but we don't have employeeId yet
    // → show on right (it's an employee message, likely mine in this task context)
    return true
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
      content:     selectedTask.description
            ? `${selectedTask.title} task assigned.\n\n${selectedTask.description}`
            : `${selectedTask.title} task assigned. Please review the requirements and proceed with the work.`,
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
                    onDelete={handleDeleteTask}
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
                {/* File preview */}
                {attachedFile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500/8 border border-primary-500/20">
                    {attachedFile.preview
                      ? <img src={attachedFile.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0"><Paperclip size={16} className="text-primary-500" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{attachedFile.name}</p>
                      <p className="text-[10px] text-gray-400">{Math.round(attachedFile.size / 1024)} KB</p>
                    </div>
                    <button onClick={() => setAttachedFile(null)} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                )}
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
                    <input ref={fileInputRef} type="file" className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                    />
                    <button className={`p-2 rounded-lg transition-colors ${attachedFile ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                      title="Attach file" onClick={() => fileInputRef.current?.click()}>
                      <Paperclip size={16} />
                    </button>
                  </div>
                  <motion.button
                    onClick={handleSend}
                    disabled={(!message.trim() && !attachedFile) || sending}
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
