// Chats.jsx — PM Project Chat Hub
// Left 30%: Project team members | Right 70%: Task chat
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Send, Paperclip, MessageSquare, Search, Users,
  Calendar, FolderOpen, ChevronDown, ArrowLeft
} from 'lucide-react'
import { api, resolveFileUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/common/Avatar'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const STATUS_MAP = {
  todo:        { label: 'Open',        dot: 'bg-gray-400',   pill: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-300' },
  in_progress: { label: 'In Progress', dot: 'bg-blue-500',   pill: 'bg-blue-500 text-white' },
  review:      { label: 'In Review',   dot: 'bg-purple-500', pill: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' },
  done:        { label: 'Closed',      dot: 'bg-green-500',  pill: 'bg-green-500 text-white' },
}

const PRIORITY_BADGE = {
  low:    'bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  high:   'bg-orange-400 text-white',
  urgent: 'bg-red-500 text-white',
}

// ── Read Tick ─────────────────────────────────────────────────────────────────
const ReadTick = ({ isRead }) => (
  <span className="flex items-center">
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ marginLeft: '-5px' }}>
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
)

// ── File Attachment ───────────────────────────────────────────────────────────
const FileMsg = ({ msg, isMe }) => {
  const absUrl = msg.file_data || resolveFileUrl(msg.file_url)
  if (!absUrl) return (
    <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] bg-gray-700/30 text-gray-500">
      <Paperclip size={9} /><span className="truncate">{msg.file_name || 'Attachment'}</span>
      <span className="ml-auto">Unavailable</span>
    </div>
  )
  const isImage = msg.file_type?.startsWith('image/')
  const isVideo = msg.file_type?.startsWith('video/')
  const doDownload = (e) => {
    e.preventDefault()
    const a = document.createElement('a')
    a.href = absUrl; a.download = msg.file_name || 'file'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  if (isImage) return (
    <div className="mt-1 space-y-0.5">
      <img src={absUrl} alt={msg.file_name} onClick={doDownload}
        className="max-w-[200px] rounded-xl cursor-pointer hover:opacity-90 border border-white/10" />
      <p className={`text-[9px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>Tap to download</p>
    </div>
  )
  if (isVideo) return (
    <div className="mt-1 space-y-1">
      <video src={absUrl} controls className="max-w-[220px] rounded-xl border border-white/10" style={{ maxHeight: 130 }} />
      <button onClick={doDownload} className={`text-[10px] px-2 py-0.5 rounded-lg ${isMe ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-dark-600 text-gray-700'}`}>⬇ Download</button>
    </div>
  )
  return (
    <button onClick={doDownload} className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border mt-1 w-full text-left ${isMe ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 hover:bg-gray-50'}`}>
      <span className="text-lg">{msg.file_name?.match(/\.pdf$/i) ? '📄' : msg.file_name?.match(/\.(xlsx?|csv)$/i) ? '📊' : msg.file_name?.match(/\.(zip|rar)$/i) ? '🗜️' : msg.file_name?.match(/\.(docx?)$/i) ? '📝' : '📎'}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{msg.file_name || 'Attachment'}</p>
        <p className={`text-[9px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>{msg.file_size_kb ? msg.file_size_kb >= 1024 ? `${(msg.file_size_kb/1024).toFixed(1)} MB` : `${msg.file_size_kb} KB` : ''} · tap to download</p>
      </div>
      <span className={`${isMe ? 'text-white/80' : 'text-gray-400'}`}>⬇</span>
    </button>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────
const Bubble = ({ msg, isMe }) => {
  const isFeedback = msg.content?.startsWith('[Feedback]')
  const text = isFeedback ? msg.content.replace('[Feedback] ', '') : msg.content
  const hasContent = text && text.trim()
  const hasFile = msg.file_url || msg.file_data

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && <Avatar name={msg.author_name || 'Employee'} src={msg.avatar_url} size="sm" />}
      <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-1 mb-0.5">{msg.author_name}</span>}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe ? (isFeedback ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-primary-500 text-white rounded-br-sm')
               : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
        }`}>
          {hasContent && <p>{text}</p>}
          {hasFile && <FileMsg msg={msg} isMe={isMe} />}
        </div>
        <div className={`flex items-center gap-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400 mx-1">{fmtTime(msg.created_at)}</span>
          {isMe && <ReadTick isRead={!!msg.is_read} />}
        </div>
      </div>
      {isMe && <Avatar name={msg.author_name || 'PM'} src={msg.avatar_url} size="sm" />}
    </motion.div>
  )
}

// ── Task Row (inside right panel task list) ───────────────────────────────────
const TaskRow = ({ task, selected, onClick, unread }) => {
  const cfg = STATUS_MAP[task.status] || STATUS_MAP.todo
  const days = task.due_date ? Math.ceil((new Date(task.due_date) - new Date()) / 86400000) : null
  const isOverdue = days !== null && days < 0 && task.status !== 'done'

  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-gray-100 dark:border-dark-700 transition-all flex items-start gap-2 ${
        selected ? 'bg-primary-500/10 border-l-2 border-l-primary-500' : 'hover:bg-gray-50 dark:hover:bg-dark-700/40 border-l-2 border-l-transparent'
      }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className={`text-xs font-semibold truncate flex-1 ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {task.title}
          </p>
          {unread > 0 && !selected && (
            <span className="min-w-[16px] h-4 px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className="text-[10px] text-gray-400">{cfg.label}</span>
          {task.due_date && (
            <span className={`text-[10px] ml-auto flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              <Calendar size={8} />{fmtDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold capitalize flex-shrink-0 mt-0.5 ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
        {task.priority}
      </span>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PMChats = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [members,        setMembers]        = useState([])  // all employees with tasks
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberTasks,    setMemberTasks]    = useState([])
  const [selectedTask,   setSelectedTask]   = useState(null)
  const [comments,       setComments]       = useState([])
  const [message,        setMessage]        = useState('')
  const [attached,       setAttached]       = useState(null)
  const [memberSearch,   setMemberSearch]   = useState('')
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [loadingTasks,   setLoadingTasks]   = useState(false)
  const [loadingChat,    setLoadingChat]    = useState(false)
  const [sending,        setSending]        = useState(false)
  const [mobileView,     setMobileView]     = useState('members') // 'members' | 'chat'

  const bottomRef = useRef(null)
  const fileRef   = useRef(null)
  const myEmpId   = user?.employee?.id

  // PM messages: author_id null
  const isMe = (msg) => !msg._synthetic && (msg.author_id === null || msg.author_id === undefined)

  // ── Load all employees who have tasks ──────────────────────────────────────
  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true)
      try {
        const res = await api.get('/tasks/team-updates')
        if (res.success) setMembers(res.data || [])
      } catch {}
      setLoadingMembers(false)
    }
    loadMembers()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  // ── Select member → load their tasks ──────────────────────────────────────
  const selectMember = async (member) => {
    setSelectedMember(member)
    setSelectedTask(null)
    setComments([])
    setMobileView('chat')
    setLoadingTasks(true)
    try {
      const res = await api.get('/tasks/team?limit=500')
      if (res.success) {
        const tasks = (res.data || []).filter(t => String(t.assigned_to) === String(member.employee_id))
        setMemberTasks(tasks)
        if (tasks.length > 0) await selectTask(tasks[0])
      }
    } catch {}
    setLoadingTasks(false)
  }

  // ── Select task → load chat ────────────────────────────────────────────────
  const selectTask = async (task) => {
    setSelectedTask(task)
    setComments([])
    setLoadingChat(true)
    try {
      const res = await api.get(`/tasks/${task.id}/comments`)
      if (res.success) {
        setComments(res.data || [])
        api.patch(`/tasks/${task.id}/comments/read`, {}).catch(() => {})
        setMemberTasks(prev => prev.map(t => t.id === task.id ? { ...t, unread_count: 0 } : t))
      }
    } catch {}
    setLoadingChat(false)
  }

  // ── Poll every 10s ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedTask) return
    const t = setInterval(async () => {
      const res = await api.get(`/tasks/${selectedTask.id}/comments`).catch(() => null)
      if (res?.success) setComments(res.data || [])
    }, 10000)
    return () => clearInterval(t)
  }, [selectedTask])

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = message.trim()
    if (!text && !attached) return
    if (!selectedTask) return
    setSending(true)
    try {
      let res
      if (attached) {
        const fd = new FormData()
        if (text) fd.append('content', text)
        fd.append('attachment', attached.file)
        res = await api.upload(`/tasks/${selectedTask.id}/comments`, fd)
      } else {
        res = await api.post(`/tasks/${selectedTask.id}/comments`, { content: text })
      }
      if (res.success) {
        setMessage('')
        setAttached(null)
        await selectTask(selectedTask)
      } else toast.error(res.message || 'Send failed')
    } catch { toast.error('Cannot connect') }
    setSending(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 MB'); return }
    setAttached({ file, name: file.name, type: file.type, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null })
    e.target.value = ''
  }

  const filteredMembers = members.filter(m =>
    !memberSearch || (m.employee_name || '').toLowerCase().includes(memberSearch.toLowerCase())
  )

  const cfg = selectedTask ? (STATUS_MAP[selectedTask.status] || STATUS_MAP.todo) : null

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">

      {/* ── LEFT 30% — Team Members ── */}
      <div className={`flex flex-col border-r border-gray-100 dark:border-dark-600 ${
        mobileView === 'members' ? 'flex w-full' : 'hidden sm:flex'
      } sm:w-[30%] flex-shrink-0`}>

        {/* Header */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-2 mb-2.5">
            <Users size={15} className="text-primary-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Team Members</h2>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-500 font-semibold">
              {members.length}
            </span>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {loadingMembers ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare size={28} className="text-gray-200 dark:text-dark-600 mb-2" />
              <p className="text-xs text-gray-400">No team members yet</p>
            </div>
          ) : (
            filteredMembers.map((member, i) => {
              const name = member.employee_name || '—'
              const isSelected = selectedMember?.employee_id === member.employee_id
              const totalUnread = (member.tasks || []).reduce((s, t) => s + (parseInt(t.unread_count) || 0), 0)

              return (
                <motion.button key={member.employee_id}
                  onClick={() => selectMember(member)}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ x: 2 }}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-dark-700 transition-all ${
                    isSelected ? 'bg-primary-500/10 border-l-2 border-l-primary-500' : 'hover:bg-gray-50 dark:hover:bg-dark-700/40 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={name} src={member.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {member.total_tasks ?? 0} task{(member.total_tasks ?? 0) !== 1 ? 's' : ''}
                        {member.overdue_tasks > 0 && <span className="ml-1.5 text-red-400 font-medium">· {member.overdue_tasks} overdue</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <MessageSquare size={12} className={isSelected ? 'text-primary-500' : 'text-gray-400'} />
                      {totalUnread > 0 && (
                        <span className="min-w-[16px] h-4 px-1 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {totalUnread}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT 70% — Chat Area ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'chat' ? 'flex' : 'hidden sm:flex'}`}>
        {!selectedMember ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/8 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-primary-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">Team Chat</p>
            <p className="text-xs text-gray-400">Select a team member to start chatting</p>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">

            {/* Task list — narrow column inside right panel */}
            <div className="w-52 flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-dark-600">
              {/* Member header */}
              <div className="px-3 py-3 border-b border-gray-100 dark:border-dark-600">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setMobileView('members'); setSelectedMember(null) }}
                    className="sm:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
                    <ArrowLeft size={14} />
                  </button>
                  <Avatar name={selectedMember.employee_name} src={selectedMember.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{selectedMember.employee_name}</p>
                    <p className="text-[10px] text-gray-400">{memberTasks.length} tasks</p>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 overflow-y-auto">
                {loadingTasks ? (
                  <div className="flex justify-center py-8">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                  </div>
                ) : memberTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-3">
                    <p className="text-xs text-gray-400">No tasks assigned</p>
                  </div>
                ) : (
                  memberTasks.map(task => (
                    <TaskRow key={task.id} task={task}
                      selected={selectedTask?.id === task.id}
                      unread={parseInt(task.unread_count) || 0}
                      onClick={() => selectTask(task)} />
                  ))
                )}
              </div>
            </div>

            {/* Chat thread */}
            <div className="flex-1 flex flex-col min-w-0">
              {!selectedTask ? (
                <div className="flex-1 flex items-center justify-center text-center px-4">
                  <p className="text-xs text-gray-400">Select a task to open chat</p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-2.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50/50 dark:bg-dark-700/30">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate flex-1">{selectedTask.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.pill}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {selectedTask.due_date && (
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={9} /> Due: {fmtDate(selectedTask.due_date)}
                      </p>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {loadingChat ? (
                      <div className="flex justify-center py-10">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare size={24} className="text-gray-300 mb-2" />
                        <p className="text-xs text-gray-400">No messages yet</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {comments.map((msg, i) => (
                          <Bubble key={msg.id || i} msg={msg} isMe={isMe(msg)} />
                        ))}
                      </AnimatePresence>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Attached preview */}
                  {attached && (
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-600">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
                        {attached.preview
                          ? <img src={attached.preview} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                          : <Paperclip size={14} className="text-primary-500 flex-shrink-0" />
                        }
                        <span className="text-xs flex-1 truncate text-gray-700 dark:text-gray-300">{attached.name}</span>
                        <button onClick={() => setAttached(null)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-600 px-3 py-2">
                        <textarea value={message}
                          onChange={e => setMessage(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                          placeholder="Type a message..."
                          rows={1}
                          className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none max-h-20 overflow-y-auto"
                          style={{ lineHeight: '1.5' }}
                        />
                      </div>
                      <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z,.txt,.csv" />
                      <button onClick={() => fileRef.current?.click()}
                        className="p-2.5 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors flex-shrink-0">
                        <Paperclip size={17} />
                      </button>
                      <button onClick={handleSend} disabled={sending || (!message.trim() && !attached)}
                        className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors flex-shrink-0">
                        {sending
                          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                              className="w-[17px] h-[17px] border-2 border-white/30 border-t-white rounded-full" />
                          : <Send size={17} />
                        }
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PMChats
