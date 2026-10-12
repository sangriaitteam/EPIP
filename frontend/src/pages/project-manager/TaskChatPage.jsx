// TaskChatPage.jsx — Full page task chat (30% members | 70% chat)
// Opened when clicking chat icon on a task row in ProjectDetail TasksTab
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Paperclip, ThumbsUp, MessageSquare,
  Calendar, AlertTriangle, X, RefreshCw, Search
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api, resolveFileUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTs = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' +
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
}
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  done:        'bg-green-500/15 text-green-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  review:      'bg-yellow-500/15 text-yellow-400',
  todo:        'bg-gray-500/15 text-gray-400',
}
const STATUS_LABELS = { done: 'Done', in_progress: 'In Progress', review: 'Review', todo: 'Pending' }
const PRIORITY_COLOR = { urgent: 'text-red-500', high: 'text-orange-500', medium: 'text-yellow-500', low: 'text-green-500' }
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
const FileAttachment = ({ msg, isMe }) => {
  const absUrl = msg.file_data || resolveFileUrl(msg.file_url)
  if (!absUrl) return (
    <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-600/30 text-gray-500 text-[11px]">
      <Paperclip size={10} /><span className="truncate">{msg.file_name || 'Attachment'}</span>
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
  if (isImage) return (
    <div className="mt-2 space-y-1">
      <img src={absUrl} alt={msg.file_name} onClick={doDownload}
        className="max-w-[240px] rounded-xl cursor-pointer hover:opacity-90 border border-white/10" />
      <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>Tap to download</p>
    </div>
  )
  if (isVideo) return (
    <div className="mt-2 space-y-1.5">
      <video src={absUrl} controls className="max-w-[260px] rounded-xl border border-white/10" style={{ maxHeight: 160 }} />
      <button onClick={doDownload} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] w-full justify-center ${isMe ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-dark-600 text-gray-700'}`}>⬇ Download video</button>
    </div>
  )
  return (
    <button onClick={doDownload}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border w-full text-left mt-2 transition-colors ${isMe ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-600 hover:bg-gray-50'}`}>
      <span className="text-2xl flex-shrink-0">
        {msg.file_name?.match(/\.pdf$/i) ? '📄' : msg.file_name?.match(/\.(xlsx?|csv)$/i) ? '📊'
          : msg.file_name?.match(/\.(zip|rar|7z)$/i) ? '🗜️' : msg.file_name?.match(/\.(docx?)$/i) ? '📝' : '📎'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{msg.file_name || 'Attachment'}</p>
        <p className={`text-[9px] mt-0.5 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
          {msg.file_size_kb ? msg.file_size_kb >= 1024 ? `${(msg.file_size_kb/1024).toFixed(1)} MB` : `${msg.file_size_kb} KB` : ''} · Tap to download
        </p>
      </div>
      <span className={`text-lg flex-shrink-0 ${isMe ? 'text-white/80' : 'text-gray-400'}`}>⬇</span>
    </button>
  )
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
const Bubble = ({ msg, isMe }) => {
  const isFeedback = msg.content?.startsWith('[Feedback]')
  const text = isFeedback ? msg.content.replace('[Feedback] ', '') : msg.content
  const hasFile = msg.file_url || msg.file_data
  const hasText = text && text.trim()

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && <Avatar name={msg.author_name || 'Employee'} src={msg.avatar_url} size="sm" />}
      <div className={`max-w-[72%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-1">{msg.author_name || 'Employee'}</span>}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isMe ? (isFeedback ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-primary-500 text-white rounded-br-sm')
               : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
        }`}>
          {isFeedback && <div className={`flex items-center gap-1 text-[10px] font-bold mb-1.5 ${isMe ? 'text-amber-100' : 'text-amber-600'}`}><ThumbsUp size={10} /> FEEDBACK</div>}
          {hasText && <p>{text}</p>}
          {hasFile && <FileAttachment msg={msg} isMe={isMe} />}
        </div>
        <div className={`flex items-center gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{fmtTs(msg.created_at)}</span>
          {isMe && <ReadTick isRead={!!msg.is_read} />}
        </div>
      </div>
      {isMe && <Avatar name={msg.author_name || 'PM'} src={msg.avatar_url} size="sm" />}
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TaskChatPage = () => {
  const { taskId }   = useParams()
  const navigate     = useNavigate()
  const location     = useLocation()
  const { user }     = useAuth()

  const [task,         setTask]         = useState(location.state?.task || null)
  const [members,      setMembers]      = useState([])
  const [allTasks,     setAllTasks]     = useState([])  // all tasks in this project
  const [selectedTask, setSelectedTask] = useState(null)
  const [comments,     setComments]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [sending,      setSending]      = useState(false)
  const [message,      setMessage]      = useState('')
  const [attached,     setAttached]     = useState(null)
  const [feedbackMode, setFeedbackMode] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')

  const bottomRef = useRef(null)
  const fileRef   = useRef(null)

  // PM messages: author_id null
  const isMyMsg = (msg) => msg.author_id === null || msg.author_id === undefined

  const projectId = location.state?.projectId || task?.project_id

  // ── Load task, project members, all project tasks ──────────────────────────
  useEffect(() => {
    const init = async () => {
      // Load task if not in state
      let currentTask = task
      if (!currentTask) {
        const res = await api.get(`/tasks/${taskId}`).catch(() => null)
        if (res?.success) { currentTask = res.data; setTask(res.data) }
      }

      // Load project members + all tasks
      const pid = projectId || currentTask?.project_id
      if (pid) {
        const projRes = await api.get(`/projects/${pid}`).catch(() => null)
        if (projRes?.success) {
          setMembers(projRes.data?.memberStats || [])
          setAllTasks(projRes.data?.tasks || [])
        }
      }
    }
    init()
  }, [taskId])

  // ── Load comments for selected task ───────────────────────────────────────
  const loadComments = async (t) => {
    setLoading(true)
    setComments([])
    try {
      const res = await api.get(`/tasks/${t.id}/comments`)
      if (res.success) {
        setComments(res.data || [])
        api.patch(`/tasks/${t.id}/comments/read`, {}).catch(() => {})
      }
    } catch {}
    setLoading(false)
  }

  // Load comments for the initial task
  useEffect(() => {
    if (task) {
      setSelectedTask(task)
      loadComments(task)
    }
  }, [task?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  // Poll every 10s
  useEffect(() => {
    if (!selectedTask) return
    const t = setInterval(() => {
      api.get(`/tasks/${selectedTask.id}/comments`).then(res => {
        if (res.success) setComments(res.data || [])
      }).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [selectedTask])

  // ── Select a member → show their task (or first task) ─────────────────────
  const selectMember = (member) => {
    const memberId = member.id
    const memberTask = allTasks.find(t => String(t.assigned_to) === String(memberId))
    if (memberTask) {
      setSelectedTask(memberTask)
      setTask(memberTask)
      loadComments(memberTask)
      // Update URL without reload
      navigate(`/pm/task-chat/${memberTask.id}`, {
        replace: true,
        state: { task: memberTask, projectId }
      })
    }
  }

  // ── Reassign ───────────────────────────────────────────────────────────────
  const handleReassign = async (newAssignedTo) => {
    if (!newAssignedTo) return
    const memberId = parseInt(newAssignedTo)
    if (isNaN(memberId)) return
    try {
      const res = await api.put(`/tasks/${selectedTask?.id || taskId}`, { assigned_to: memberId })
      if (res.success) {
        toast.success('Task reassigned!')
        const taskRes = await api.get(`/tasks/${selectedTask?.id || taskId}`)
        if (taskRes.success) { setTask(taskRes.data); setSelectedTask(taskRes.data) }
        setShowReassign(false)
      } else toast.error(res.message || 'Reassign failed')
    } catch { toast.error('Cannot connect') }
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = feedbackMode ? `[Feedback] ${message.trim()}` : message.trim()
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
        setFeedbackMode(false)
        await loadComments(selectedTask)
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

  const displayTask = selectedTask || task
  const filteredMembers = members.filter(m => {
    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
    return !memberSearch || name.toLowerCase().includes(memberSearch.toLowerCase())
  })

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden"
      onClick={() => showReassign && setShowReassign(false)}>

      {/* ── LEFT 30% — Project Team Members ── */}
      <div className="w-[30%] min-w-[200px] max-w-[280px] flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-dark-600">

        {/* Back button + header */}
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100 dark:border-dark-600">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Team</h2>
            <p className="text-[10px] text-gray-400">{members.length} members</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-dark-600">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-3">
              <p className="text-xs text-gray-400">No team members</p>
            </div>
          ) : (
            filteredMembers.map((m, i) => {
              const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
              const memberTask = allTasks.find(t => String(t.assigned_to) === String(m.id))
              const isCurrentAssignee = String(m.id) === String(displayTask?.assigned_to)

              return (
                <motion.button key={m.id}
                  onClick={() => memberTask ? selectMember(m) : null}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ x: 2 }}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-dark-700 transition-all ${
                    isCurrentAssignee
                      ? 'bg-primary-500/10 border-l-2 border-l-primary-500'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-700/40 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={name} src={m.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate leading-tight ${isCurrentAssignee ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">{m.designation || '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <MessageSquare size={12} className={isCurrentAssignee ? 'text-primary-500' : 'text-gray-400'} />
                      {isCurrentAssignee && (
                        <span className="text-[9px] text-primary-500 font-semibold">Active</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT 70% — Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
              <MessageSquare size={14} className="text-primary-500 flex-shrink-0" />
              {displayTask?.title || 'Task Chat'}
            </h1>
            <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-gray-400 flex-wrap">
              {(displayTask?.assigned_to_name || displayTask?.assignee_name) && (
                <span>👤 {displayTask.assigned_to_name || displayTask.assignee_name}</span>
              )}
              {displayTask?.status && (
                <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[displayTask.status] || STATUS_COLORS.todo}`}>
                  {STATUS_LABELS[displayTask.status] || displayTask.status}
                </span>
              )}
              {displayTask?.due_date && (
                <span className="flex items-center gap-0.5"><Calendar size={9} /> {fmtDate(displayTask.due_date)}</span>
              )}
              {displayTask?.priority && (
                <span className={`font-semibold capitalize ${PRIORITY_COLOR[displayTask.priority] || ''}`}>
                  <AlertTriangle size={9} className="inline mr-0.5" />{displayTask.priority}
                </span>
              )}
            </div>
          </div>

          {/* Reassign button */}
          {members.length > 0 && (
            <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowReassign(s => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-500 hover:bg-primary-500 hover:text-white transition-colors">
                <RefreshCw size={12} /> Reassign
              </button>
              <AnimatePresence>
                {showReassign && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-gray-100 dark:border-dark-600 overflow-hidden">
                    <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-dark-600">
                      Reassign to
                    </p>
                    {members.map(m => {
                      const name = `${m.first_name || ''} ${m.last_name || ''}`.trim()
                      const isCurrent = String(m.id) === String(displayTask?.assigned_to)
                      return (
                        <button key={m.id} onClick={() => handleReassign(m.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 ${isCurrent ? 'text-primary-500 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                          <span className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-[9px] font-bold text-primary-600 flex-shrink-0">
                            {name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </span>
                          <span className="truncate">{name}</span>
                          {isCurrent && <span className="ml-auto">✓</span>}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-500">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation about this task</p>
            </div>
          ) : (
            <AnimatePresence>
              {comments.map((msg, i) => <Bubble key={msg.id || i} msg={msg} isMe={isMyMsg(msg)} />)}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Attached file preview */}
        {attached && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-600 flex-shrink-0">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-primary-500/10 border border-primary-500/20">
              {attached.preview
                ? <img src={attached.preview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                : <Paperclip size={16} className="text-primary-500 flex-shrink-0" />
              }
              <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{attached.name}</span>
              <button onClick={() => setAttached(null)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Feedback mode banner */}
        {feedbackMode && (
          <div className="px-4 py-1.5 bg-amber-500/10 border-t border-amber-500/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ThumbsUp size={12} /> Feedback mode
              </span>
              <button onClick={() => setFeedbackMode(false)} className="text-amber-500 text-xs">Cancel</button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 flex-shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-600 px-3 py-2">
              <textarea value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={feedbackMode ? 'Write feedback...' : 'Type a message...'}
                rows={1}
                className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none max-h-24 overflow-y-auto"
                style={{ lineHeight: '1.5' }}
              />
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv" />
            <button onClick={() => fileRef.current?.click()}
              className="p-2.5 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors flex-shrink-0" title="Attach file">
              <Paperclip size={18} />
            </button>
            <button onClick={() => setFeedbackMode(f => !f)}
              className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${feedbackMode ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
              title="Send as feedback">
              <ThumbsUp size={18} />
            </button>
            <button onClick={handleSend} disabled={sending || (!message.trim() && !attached)}
              className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors flex-shrink-0">
              {sending
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full" />
                : <Send size={18} />
              }
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}

export default TaskChatPage
