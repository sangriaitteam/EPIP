// TaskChatPage.jsx — Full page task chat (PM ↔ Employee)
// Opened when clicking chat icon on a task row in ProjectDetail TasksTab
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Paperclip, ThumbsUp,
  Calendar, AlertTriangle, X, MessageSquare
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api, resolveFileUrl } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTs = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ', ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
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

// ── File Attachment Renderer ──────────────────────────────────────────────────
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
        className="max-w-[260px] rounded-xl cursor-pointer hover:opacity-90 border border-white/10" />
      <p className={`text-[10px] ${isMe ? 'text-white/60' : 'text-gray-400'}`}>Tap to download</p>
    </div>
  )
  if (isVideo) return (
    <div className="mt-2 space-y-1.5">
      <video src={absUrl} controls className="max-w-[280px] rounded-xl border border-white/10" style={{ maxHeight: 180 }} />
      <button onClick={doDownload}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium w-full justify-center ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300'} transition-colors`}>
        ⬇ Download video
      </button>
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
        <p className={`text-[11px] font-semibold truncate ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
          {msg.file_name || 'Attachment'}
        </p>
        <p className={`text-[9px] mt-0.5 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
          {msg.file_size_kb ? msg.file_size_kb >= 1024 ? `${(msg.file_size_kb / 1024).toFixed(1)} MB` : `${msg.file_size_kb} KB` : ''} · Tap to download
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
  const hasContent = text && text.trim()
  const hasFile    = msg.file_url || msg.file_data

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMe && <Avatar name={msg.author_name || 'Employee'} src={msg.avatar_url} size="sm" />}

      <div className={`max-w-[70%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-1">
            {msg.author_name || 'Employee'}
          </span>
        )}

        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? isFeedback ? 'bg-amber-500 text-white rounded-br-sm' : 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-sm'
        }`}>
          {isFeedback && (
            <div className={`flex items-center gap-1 text-[10px] font-bold mb-1.5 ${isMe ? 'text-amber-100' : 'text-amber-600'}`}>
              <ThumbsUp size={10} /> FEEDBACK
            </div>
          )}
          {hasContent && <p>{text}</p>}
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

  // Task can come from navigation state (fast) or fetched from API
  const [task,        setTask]        = useState(location.state?.task || null)
  const [comments,    setComments]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [sending,     setSending]     = useState(false)
  const [message,     setMessage]     = useState('')
  const [attached,    setAttached]    = useState(null)
  const [feedbackMode,setFeedbackMode]= useState(false)

  const bottomRef  = useRef(null)
  const fileRef    = useRef(null)

  // PM messages have author_id = null
  const isMyMsg = (msg) => msg.author_id === null || msg.author_id === undefined

  // Load task if not in state
  useEffect(() => {
    if (!task) {
      api.get(`/tasks/${taskId}`).then(res => {
        if (res.success) setTask(res.data)
      }).catch(() => {})
    }
  }, [taskId])

  const loadComments = async () => {
    try {
      const res = await api.get(`/tasks/${taskId}/comments`)
      if (res.success) {
        setComments(res.data || [])
        api.patch(`/tasks/${taskId}/comments/read`, {}).catch(() => {})
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadComments() }, [taskId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  // Poll every 10s for new messages
  useEffect(() => {
    const t = setInterval(() => {
      api.get(`/tasks/${taskId}/comments`).then(res => {
        if (res.success) setComments(res.data || [])
      }).catch(() => {})
    }, 10000)
    return () => clearInterval(t)
  }, [taskId])

  const handleSend = async () => {
    const text = feedbackMode ? `[Feedback] ${message.trim()}` : message.trim()
    if (!text && !attached) return
    setSending(true)
    try {
      let res
      if (attached) {
        const fd = new FormData()
        if (text) fd.append('content', text)
        fd.append('attachment', attached.file)
        res = await api.upload(`/tasks/${taskId}/comments`, fd)
      } else {
        res = await api.post(`/tasks/${taskId}/comments`, { content: text })
      }
      if (res.success) {
        setMessage('')
        setAttached(null)
        setFeedbackMode(false)
        await loadComments()
      } else toast.error(res.message || 'Send failed')
    } catch { toast.error('Cannot connect') }
    setSending(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Max 10 MB'); return }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setAttached({ file, name: file.name, type: file.type, size: file.size, preview })
    e.target.value = ''
  }

  const projectId = location.state?.projectId || task?.project_id

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-dark-600 flex-shrink-0">
        <button onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
            <MessageSquare size={15} className="text-primary-500 flex-shrink-0" />
            {task?.title || 'Task Chat'}
          </h1>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400 flex-wrap">
            {(task?.assigned_to_name || task?.assignee_name) && (
              <span>👤 {task.assigned_to_name || task.assignee_name}</span>
            )}
            {task?.status && (
              <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[task.status] || STATUS_COLORS.todo}`}>
                {STATUS_LABELS[task.status] || task.status}
              </span>
            )}
            {task?.due_date && (
              <span className="flex items-center gap-0.5">
                <Calendar size={9} /> {fmtDate(task.due_date)}
              </span>
            )}
            {task?.priority && (
              <span className={`font-semibold capitalize flex items-center gap-0.5 ${PRIORITY_COLOR[task.priority] || ''}`}>
                <AlertTriangle size={9} /> {task.priority}
              </span>
            )}
          </div>
        </div>
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
            {comments.map((msg, i) => (
              <Bubble key={msg.id || i} msg={msg} isMe={isMyMsg(msg)} />
            ))}
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
            <button onClick={() => setFeedbackMode(false)} className="text-amber-500 hover:text-amber-700 text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 flex-shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200 dark:border-dark-600 px-3 py-2 flex items-end gap-2">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={feedbackMode ? 'Write feedback...' : 'Type a message...'}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none focus:outline-none max-h-24 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
          </div>

          {/* File attach */}
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt,.csv" />
          <button onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors flex-shrink-0"
            title="Attach file">
            <Paperclip size={18} />
          </button>

          {/* Feedback */}
          <button onClick={() => setFeedbackMode(f => !f)}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${feedbackMode ? 'text-amber-500 bg-amber-500/10' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'}`}
            title="Send as feedback">
            <ThumbsUp size={18} />
          </button>

          {/* Send */}
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
  )
}

export default TaskChatPage
