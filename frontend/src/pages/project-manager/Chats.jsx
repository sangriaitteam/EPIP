// Chats.jsx — PM Task Communication Hub
// 3-panel layout: Employees → Employee's Tasks → Chat Thread
// All messages stored in task_comments — same table employee uses, so fully bidirectional
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Send, Paperclip, Smile,
  MessageSquare, FolderOpen, Calendar, AlertTriangle,
  ChevronDown, Search, Users, CheckCircle2
} from 'lucide-react'
import { api, resolveFileUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/common/Avatar'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  todo:        { label: 'Open',        pill: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-300',        dot: 'bg-gray-400' },
  in_progress: { label: 'In Progress', pill: 'bg-blue-500 text-white',                                               dot: 'bg-blue-500' },
  review:      { label: 'In Review',   pill: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300', dot: 'bg-purple-500' },
  done:        { label: 'Closed',      pill: 'bg-green-500 text-white',                                              dot: 'bg-green-500' },
}

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

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const fmtDateTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return `${date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}`
}

const daysLeft = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null

const taskCode = (t) =>
  `E${(t.project_name || 'Z').charAt(0).toUpperCase()}${String(t.id).padStart(2, '0')}-TS${t.id}`

// ── Read Tick (WhatsApp style) ────────────────────────────────────────────────
// Single gray = sent, Double blue = read
const ReadTick = ({ isRead }) => (
  <span className="flex items-center" title={isRead ? 'Read' : 'Sent'}>
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ marginLeft: '-5px' }}>
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
)

// ── Chat Message Bubble ───────────────────────────────────────────────────────
// isMe = true → PM sent this (right side, primary color)
// isMe = false → Employee sent this (left side, gray)
const ChatBubble = ({ msg, isMe }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
  >
    <Avatar name={msg.author_name || (isMe ? 'PM' : 'Employee')} src={msg.avatar_url} size="sm" />

    <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
      {!isMe && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {msg.author_name || 'Employee'}
          </span>
          <span className="text-[10px] text-gray-400">{fmtDateTime(msg.created_at)}</span>
        </div>
      )}

      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isMe
          ? 'bg-primary-500 text-white rounded-br-sm'
          : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
      }`}>
        {msg.content && msg.content.trim() && <p>{msg.content}</p>}
        {/* File attachment */}
        {(msg.file_url || msg.file_data) && (() => {
          const absUrl = msg.file_data || resolveFileUrl(msg.file_url)
          if (!absUrl) return (
            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-600/30 text-gray-500 text-[11px]">
              <Paperclip size={10}/><span className="truncate">{msg.file_name || 'Attachment'}</span>
              <span className="ml-auto text-[10px]">Unavailable</span>
            </div>
          )
          const isImage = msg.file_type?.startsWith('image/')
          const isVideo = msg.file_type?.startsWith('video/')
          const doDownload = (e) => {
            e.preventDefault()
            const a = document.createElement('a')
            a.href = absUrl; a.download = msg.file_name || 'attachment'
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
          }
          return (
            <div className="mt-2">
              {isImage ? (
                <div className="space-y-0.5">
                  <img src={absUrl} alt={msg.file_name} onClick={doDownload}
                    className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 border border-white/10" />
                  <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>Tap to download</p>
                </div>
              ) : isVideo ? (
                <div className="space-y-1">
                  <video src={absUrl} controls className="max-w-[240px] rounded-xl border border-white/10" style={{ maxHeight: 150 }} />
                  <button onClick={doDownload} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] w-full justify-center ${isMe ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'}`}>
                    ⬇ Download video
                  </button>
                </div>
              ) : (
                <button onClick={doDownload} className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-full text-left mt-1 ${isMe ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 hover:bg-gray-50'}`}>
                  <span className="text-xl">
                    {msg.file_name?.match(/\.pdf$/i) ? '📄' : msg.file_name?.match(/\.(xlsx?|csv)$/i) ? '📊'
                      : msg.file_name?.match(/\.(zip|rar|7z)$/i) ? '🗜️' : msg.file_name?.match(/\.(docx?)$/i) ? '📝' : '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-semibold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{msg.file_name || 'Attachment'}</p>
                    <p className={`text-[9px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                      {msg.file_size_kb ? msg.file_size_kb >= 1024 ? `${(msg.file_size_kb/1024).toFixed(1)} MB` : `${msg.file_size_kb} KB` : ''} · Tap to download
                    </p>
                  </div>
                  <span className={`text-base ${isMe ? 'text-white/80' : 'text-gray-400'}`}>⬇</span>
                </button>
              )}
            </div>
          )
        })()
        {msg._isFirst && !isMe && (
          <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400">
            <Paperclip size={11} /> Task Assignment
          </div>
        )}
      </div>

      {isMe && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">{fmtDateTime(msg.created_at)}</span>
          <ReadTick isRead={!!msg.is_read} />
        </div>
      )}
    </div>
  </motion.div>
)

// ── Employee Card (left panel) ────────────────────────────────────────────────
const EmployeeCard = ({ emp, selected, onClick }) => {
  const empName = emp.employee_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
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
      <div className="flex items-center gap-3">
        <Avatar name={empName} src={emp.avatar_url} size="sm" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${
            selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'
          }`}>{empName}</p>
          <p className="text-[11px] text-gray-400">
            {emp.total_tasks ?? emp.tasks?.length ?? 0} task{(emp.total_tasks ?? emp.tasks?.length ?? 0) !== 1 ? 's' : ''}
            {emp.overdue_tasks > 0 && (
              <span className="ml-1.5 text-red-400 font-medium">· {emp.overdue_tasks} overdue</span>
            )}
          </p>
        </div>
        {/* unread indicator placeholder */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selected ? 'bg-primary-500' : 'bg-transparent'}`} />
      </div>
    </motion.button>
  )
}

// ── Task Item (middle panel) ──────────────────────────────────────────────────
const TaskItem = ({ task, selected, onClick, onDelete }) => {
  const cfg = STATUS_MAP[task.status] || STATUS_MAP.todo
  const days = daysLeft(task.due_date)
  const isOverdue = days !== null && days < 0 && task.status !== 'done'
  const unread = parseInt(task.unread_count) || 0

  return (
    <div className="relative group/task">
      <motion.button
        onClick={onClick}
        whileHover={{ x: 2 }}
        className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-dark-700 transition-all pr-10 ${
          selected
            ? 'bg-primary-500/8 border-l-2 border-l-primary-500'
            : 'hover:bg-gray-50 dark:hover:bg-dark-700/40 border-l-2 border-l-transparent'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className={`text-sm font-semibold leading-tight flex-1 ${
            selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'
          }`}>{task.title}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {unread > 0 && !selected && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center"
              >
                {unread > 99 ? '99+' : unread}
              </motion.span>
            )}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
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
              <Calendar size={9} />{fmtDate(task.due_date)}
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

      {/* Delete button — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(task) }}
        className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover/task:opacity-100 transition-all z-10"
        title="Delete task"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const PMChats = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const autoTaskId = searchParams.get('taskId')

  // Panel state
  const [employees,       setEmployees]       = useState([])
  const [selectedEmp,     setSelectedEmp]     = useState(null)
  const [empTasks,        setEmpTasks]        = useState([])
  const [selectedTask,    setSelectedTask]    = useState(null)
  const [comments,        setComments]        = useState([])

  // Loading
  const [loadingEmps,     setLoadingEmps]     = useState(true)
  const [loadingTasks,    setLoadingTasks]    = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [sending,         setSending]         = useState(false)

  // Search
  const [empSearch,  setEmpSearch]  = useState('')
  const [taskSearch, setTaskSearch] = useState('')

  // Message input
  const [message, setMessage] = useState('')
  const [attachedFile, setAttachedFile] = useState(null) // { file, preview, name }
  const fileInputRef = useRef(null)

  // Mobile step: 'employees' | 'tasks' | 'chat'
  const [mobileStep, setMobileStep] = useState('employees')

  const chatBottomRef = useRef(null)
  const textareaRef   = useRef(null)

  // My employee record — to identify PM's own comments
  const myEmployeeId = user?.employee?.id

  // ── Load all employees who have tasks assigned ──────────────────────────
  const loadEmployees = async () => {
    setLoadingEmps(true)
    try {
      const res = await api.get('/tasks/team-updates')
      if (res.success) {
        setEmployees(res.data || [])
      }
    } catch {}
    setLoadingEmps(false)
  }

  // ── Load tasks for a specific employee ──────────────────────────────────
  const loadEmpTasks = async (empId) => {
    setLoadingTasks(true)
    setEmpTasks([])
    setSelectedTask(null)
    setComments([])
    try {
      // team-updates already includes tasks per employee
      // But we need full task list — use team endpoint filtered by employee
      const res = await api.get(`/tasks/team?limit=500`)
      if (res.success) {
        const all = res.data || []
        const mine = all.filter(t => String(t.assigned_to) === String(empId))
        setEmpTasks(mine)
        // Auto-select first task
        if (mine.length > 0) {
          await loadComments(mine[0])
        }
      }
    } catch {}
    setLoadingTasks(false)
  }

  // ── Load comments for a task ─────────────────────────────────────────────
  const loadComments = async (task) => {
    setSelectedTask(task)
    setComments([])
    setLoadingComments(true)
    try {
      const res = await api.get(`/tasks/${task.id}/comments`)
      if (res.success) {
        const data = res.data || []
        if (data.length > 0) data[0]._isFirst = true
        setComments(data)
        // Mark employee's messages as read (PM is viewing) — triggers blue ticks on employee side
        api.patch(`/tasks/${task.id}/comments/read`, {}).catch(() => {})
        // Clear unread badge in task list optimistically
        setEmpTasks(prev => prev.map(t => t.id === task.id ? { ...t, unread_count: 0 } : t))
      } else {
        setComments([{
          id:          'syn-0',
          author_id:   null,
          author_name: 'Project Manager',
          avatar_url:  null,
          content:     task.description
            ? `${task.title} task assigned.\n\n${task.description}`
            : `${task.title} task assigned. Please review the requirements and proceed with the work.`,
          created_at:  task.created_at,
          _isFirst:    true,
          _synthetic:  true,
        }])
      }
    } catch {
      setComments([])
    }
    setLoadingComments(false)
  }

  useEffect(() => { loadEmployees() }, [])

  // Auto-open task from URL param (e.g. ?taskId=5 from ProjectDetail chat button)
  useEffect(() => {
    if (!autoTaskId || employees.length === 0) return
    const taskIdNum = parseInt(autoTaskId)
    // Find which employee has this task
    const emp = employees.find(e => (e.tasks || []).some(t => t.id === taskIdNum))
    if (emp) {
      handleSelectEmp(emp).then(() => {
        // loadEmpTasks sets empTasks — we need to find the task after load
      })
    }
  }, [autoTaskId, employees]) // eslint-disable-line

  // When empTasks loads and autoTaskId set, auto-select that task
  useEffect(() => {
    if (!autoTaskId || empTasks.length === 0) return
    const task = empTasks.find(t => t.id === parseInt(autoTaskId))
    if (task && selectedTask?.id !== task.id) {
      handleSelectTask(task)
    }
  }, [empTasks, autoTaskId]) // eslint-disable-line

  // Scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // ── Delete task ─────────────────────────────────────────────────────────
  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    try {
      const res = await api.delete(`/tasks/${task.id}`)
      if (res.success) {
        toast.success('Task deleted')
        setEmpTasks(prev => prev.filter(t => t.id !== task.id))
        if (selectedTask?.id === task.id) {
          setSelectedTask(null)
          setComments([])
        }
      } else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect') }
  }

  // ── Select employee ──────────────────────────────────────────────────────
  const handleSelectEmp = async (emp) => {
    setSelectedEmp(emp)
    setEmpSearch('')
    setTaskSearch('')
    await loadEmpTasks(emp.employee_id)
    setMobileStep('tasks')
  }

  // ── Select task ──────────────────────────────────────────────────────────
  const handleSelectTask = async (task) => {
    setMessage('')
    await loadComments(task)
    setMobileStep('chat')
  }

  // ── Send message (PM → Employee) ─────────────────────────────────────────
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
        res = await api.upload(`/tasks/${selectedTask.id}/comments`, fd)
      } else {
        res = await api.post(`/tasks/${selectedTask.id}/comments`, { content })
      }
      if (res.success) {
        setMessage('')
        setAttachedFile(null)
        await loadComments(selectedTask)
        toast.success('Message sent')
      } else {
        toast.error(res.message || 'Failed to send')
      }
    } catch {
      toast.error('Cannot connect to server')
    }
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

  // ── Is this comment from me (PM)? ────────────────────────────────────────
  // Case 1: PM has an employee record → author_id matches myEmployeeId
  // Case 2: PM has NO employee record → author_id is NULL (only non-employees post with null)
  const isMyComment = (c) => {
    if (c._synthetic) return false
    // NULL author_id means it was posted by a non-employee user (PM/HR/Admin) — always "mine" on PM side
    if (c.author_id === null || c.author_id === undefined) return true
    if (!myEmployeeId) return false
    return String(c.author_id) === String(myEmployeeId)
  }

  // Filtered lists
  const filteredEmps = employees.filter(e =>
    !empSearch || (e.employee_name || '').toLowerCase().includes(empSearch.toLowerCase())
  )
  const filteredTasks = empTasks.filter(t =>
    !taskSearch ||
    (t.title || '').toLowerCase().includes(taskSearch.toLowerCase()) ||
    (t.project_name || '').toLowerCase().includes(taskSearch.toLowerCase())
  )

  const selectedEmpName = selectedEmp?.employee_name || ''
  const days = selectedTask ? daysLeft(selectedTask.due_date) : null
  const isOverdue = days !== null && days < 0 && selectedTask?.status !== 'done'
  const cfg = selectedTask ? (STATUS_MAP[selectedTask.status] || STATUS_MAP.todo) : null

  // ── Panel visibility (mobile step-based) ────────────────────────────────
  const showEmps  = mobileStep === 'employees'
  const showTasks = mobileStep === 'tasks'
  const showChat  = mobileStep === 'chat'

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">

      {/* ══ PANEL 1: Employees ══════════════════════════════════════════ */}
      <div className={`w-full sm:w-64 lg:w-72 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-dark-600 ${
        showEmps ? 'flex' : 'hidden sm:flex'
      }`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-primary-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Chats</h2>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              placeholder="Search employee…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto">
          {loadingEmps ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : filteredEmps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare size={28} className="text-gray-200 dark:text-dark-600 mb-2" />
              <p className="text-xs text-gray-400">No employees with tasks yet</p>
            </div>
          ) : (
            filteredEmps.map((emp, i) => (
              <motion.div key={emp.employee_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <EmployeeCard
                  emp={emp}
                  selected={selectedEmp?.employee_id === emp.employee_id}
                  onClick={() => handleSelectEmp(emp)}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ══ PANEL 2: Tasks of selected employee ═════════════════════════ */}
      <div className={`w-full sm:w-64 lg:w-72 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-dark-600 ${
        showTasks ? 'flex' : 'hidden sm:flex'
      }`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-2 mb-3">
            {/* Mobile back */}
            <button onClick={() => setMobileStep('employees')}
              className="sm:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
              <ArrowLeft size={15} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold truncate">
                {selectedEmpName || 'Select Employee'}
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {empTasks.length} Task{empTasks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={taskSearch}
              onChange={e => setTaskSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto">
          {!selectedEmp ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users size={28} className="text-gray-200 dark:text-dark-600 mb-2" />
              <p className="text-xs text-gray-400">Select an employee to see their tasks</p>
            </div>
          ) : loadingTasks ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CheckCircle2 size={28} className="text-gray-200 dark:text-dark-600 mb-2" />
              <p className="text-xs text-gray-400">No tasks found</p>
            </div>
          ) : (
            filteredTasks.map((task, i) => (
              <motion.div key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TaskItem
                  task={task}
                  selected={selectedTask?.id === task.id}
                  onClick={() => handleSelectTask(task)}
                  onDelete={handleDeleteTask}
                />
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ══ PANEL 3: Chat Thread ════════════════════════════════════════ */}
      <div className={`flex-1 flex flex-col min-w-0 ${
        showChat ? 'flex' : 'hidden sm:flex'
      }`}>
        {!selectedTask ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/8 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-primary-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Task Communication</p>
            <p className="text-xs text-gray-400">Select an employee → task to start chatting</p>
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 flex items-start gap-3">
              {/* Mobile back */}
              <button onClick={() => setMobileStep('tasks')}
                className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 flex-shrink-0 mt-0.5">
                <ArrowLeft size={17} />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  Task Communication
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 flex-wrap">
                  <span>{selectedEmpName}</span>
                  <span>›</span>
                  <span className="text-gray-600 dark:text-gray-300 font-medium">{selectedTask.title}</span>
                </p>
              </div>
            </div>

            {/* ── Task Info Bar ── */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50/50 dark:bg-dark-700/30">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-dark-600 flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={14} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedTask.title}</span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-gray-400">
                    <span className="font-mono font-semibold text-primary-500">{taskCode(selectedTask)}</span>
                    {selectedTask.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                        <Calendar size={9} /> {fmtDate(selectedTask.due_date)}
                        {isOverdue && ' (overdue)'}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 capitalize font-semibold ${PRIORITY_COLOR[selectedTask.priority]}`}>
                      <AlertTriangle size={9} /> {selectedTask.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5">
              {loadingComments ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : (
                <AnimatePresence>
                  {comments.map((msg, i) => (
                    <ChatBubble
                      key={msg.id || i}
                      msg={msg}
                      isMe={isMyComment(msg)}
                    />
                  ))}
                </AnimatePresence>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* ── Input ── */}
            <div className="px-4 sm:px-5 py-4 border-t border-gray-100 dark:border-dark-600 bg-white dark:bg-dark-800">
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
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedEmpName || 'employee'}…`}
                  rows={2}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {/* Hidden file input */}
                    <input ref={fileInputRef} type="file" className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={handleFileSelect}
                    />
                    <button
                      className={`p-2 rounded-lg transition-colors ${attachedFile ? 'bg-primary-500/10 text-primary-500' : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-600'}`}
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file"
                    >
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

export default PMChats
