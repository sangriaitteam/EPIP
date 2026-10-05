// GroupChats.jsx — Project Group Chat Hub
// Left panel: project rooms list | Right panel: group message thread
// Messages stored in task_comments (project-level tasks) — fully bidirectional with employees
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hash, Send, Paperclip, Search, Users, Plus, X,
  MessageSquare, FolderOpen, Clock, CheckCircle2,
  ChevronRight, Loader2, RefreshCw, AlertCircle, Smile,
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/common/Avatar'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
    ' · ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
}

const fmtLastMsg = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now  = new Date()
  const diffMs  = now - date
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)   return `${diffH}h ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const statusColor = (s) => ({
  active:      'bg-green-500',
  planning:    'bg-yellow-500',
  on_hold:     'bg-orange-500',
  completed:   'bg-blue-500',
  cancelled:   'bg-red-500',
}[s] || 'bg-gray-400')

const statusLabel = (s) => ({
  active: 'Active', planning: 'Planning', on_hold: 'On Hold',
  completed: 'Completed', cancelled: 'Cancelled',
}[s] || s)

// ── Read Tick ─────────────────────────────────────────────────────────────────
const ReadTick = ({ isRead }) => (
  <span className="inline-flex items-center" title={isRead ? 'Read' : 'Sent'}>
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg width="11" height="9" viewBox="0 0 11 9" fill="none" style={{ marginLeft: '-5px' }}>
      <path d="M1 4.5L3.8 7.5L10 1" stroke={isRead ? '#3b82f6' : '#9ca3af'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </span>
)

// ── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isMe }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
  >
    {!isMe && (
      <Avatar name={msg.author_name || '?'} src={msg.author_avatar} size="xs" animate={false} />
    )}
    <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
      {!isMe && (
        <span className="text-[10px] text-gray-400 font-medium mb-1 ml-1">
          {msg.author_name || 'Unknown'}
        </span>
      )}
      {/* File attachment */}
      {msg.file_url && (
        <a href={msg.file_url} target="_blank" rel="noreferrer"
          className={`mb-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors
            ${isMe
              ? 'bg-primary-600 text-white border-primary-500/40 hover:bg-primary-700'
              : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-500 hover:bg-gray-50 dark:hover:bg-dark-600'
            }`}>
          <Paperclip size={11} />
          <span className="truncate max-w-[160px]">{msg.file_name || 'Attachment'}</span>
        </a>
      )}
      {/* Text bubble */}
      {msg.content && (
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
          ${isMe
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-white dark:bg-dark-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-dark-600 rounded-bl-sm'
          }`}>
          {msg.content}
        </div>
      )}
      <div className={`flex items-center gap-1 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
        <span className="text-[10px] text-gray-400">{fmtTime(msg.created_at)}</span>
        {isMe && <ReadTick isRead={!!msg.is_read} />}
      </div>
    </div>
  </motion.div>
)

// ── Project Room Card ─────────────────────────────────────────────────────────
const RoomCard = ({ project, selected, onClick, unread }) => (
  <motion.button
    whileHover={{ x: 2 }}
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left
      ${selected
        ? 'bg-primary-500/10 border border-primary-500/30'
        : 'hover:bg-gray-50 dark:hover:bg-dark-700 border border-transparent'
      }`}
  >
    {/* Icon */}
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg
      ${selected ? 'bg-primary-500/20' : 'bg-gray-100 dark:bg-dark-600'}`}>
      <FolderOpen size={18} className={selected ? 'text-primary-500' : 'text-gray-400'} />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <p className={`text-sm font-semibold truncate ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
          {project.name}
        </p>
        {project._lastMsgAt && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtLastMsg(project._lastMsgAt)}</span>
        )}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor(project.status)}`} />
          <span className="text-[10px] text-gray-400">{statusLabel(project.status)}</span>
          <span className="text-[10px] text-gray-300 dark:text-dark-500">·</span>
          <Users size={9} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">{project.member_count || 0}</span>
        </div>
        {unread > 0 && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary-500 text-white text-[10px] font-bold px-1">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
    </div>
  </motion.button>
)

// ── Main Component ────────────────────────────────────────────────────────────
const GroupChats = () => {
  const { user } = useAuth()

  // Panels
  const [projects,        setProjects]        = useState([])
  const [selectedProject, setSelectedProject] = useState(null)

  // Messages — we load all task comments for the selected project
  const [tasks,           setTasks]           = useState([])
  const [messages,        setMessages]        = useState([])
  const [members,         setMembers]         = useState([])

  // Loading
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingMsgs,     setLoadingMsgs]     = useState(false)
  const [sending,         setSending]         = useState(false)
  const [refreshing,      setRefreshing]      = useState(false)

  // Input
  const [message,         setMessage]         = useState('')
  const [attachedFile,    setAttachedFile]    = useState(null)
  const [search,          setSearch]          = useState('')

  // Mobile: show room list or chat panel
  const [mobileView,      setMobileView]      = useState('rooms') // 'rooms' | 'chat'

  const fileInputRef  = useRef(null)
  const chatBottomRef = useRef(null)
  const textareaRef   = useRef(null)
  const pollRef       = useRef(null)

  // ── Load projects ──────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const res = await api.get('/projects')
      if (res.success) {
        const list = (res.data?.projects || res.data || []).map(p => ({
          ...p,
          _lastMsgAt: null,
        }))
        setProjects(list)
        // Auto-select first if none selected
        if (!selectedProject && list.length > 0) setSelectedProject(list[0])
      }
    } catch { toast.error('Could not load projects') }
    setLoadingProjects(false)
  }, [selectedProject])

  useEffect(() => { loadProjects() }, [])  // eslint-disable-line

  // ── Load messages for selected project ────────────────────────────────────
  const loadMessages = useCallback(async (silent = false) => {
    if (!selectedProject) return
    if (!silent) setLoadingMsgs(true)
    else setRefreshing(true)
    try {
      // Get all tasks for this project
      const tRes = await api.get(`/projects/${selectedProject.id}`)
      if (tRes.success) {
        const allTasks   = tRes.data?.tasks || []
        const allMembers = tRes.data?.memberStats || []
        setTasks(allTasks)
        setMembers(allMembers)

        // Gather all comments from all tasks (group chat = all task comments)
        const commentFetches = allTasks.map(t =>
          api.get(`/tasks/${t.id}/comments`).catch(() => ({ success: false }))
        )
        const results = await Promise.all(commentFetches)
        const allComments = []
        results.forEach((r, i) => {
          if (r.success && Array.isArray(r.data)) {
            r.data.forEach(c => allComments.push({
              ...c,
              _taskTitle: allTasks[i]?.title || '',
              _taskId:    allTasks[i]?.id,
            }))
          }
        })
        // Sort by created_at ascending
        allComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        setMessages(allComments)

        // Update lastMsgAt on project
        if (allComments.length > 0) {
          const last = allComments[allComments.length - 1]
          setProjects(prev => prev.map(p =>
            p.id === selectedProject.id ? { ...p, _lastMsgAt: last.created_at } : p
          ))
        }
      }
    } catch {}
    setLoadingMsgs(false)
    setRefreshing(false)
  }, [selectedProject])

  useEffect(() => {
    if (selectedProject) loadMessages()
  }, [selectedProject])  // eslint-disable-line

  // ── Auto scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Poll every 15s ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => {
      if (selectedProject) loadMessages(true)
    }, 15000)
    return () => clearInterval(pollRef.current)
  }, [selectedProject, loadMessages])

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() && !attachedFile) return
    if (!selectedProject) return

    // Find a task to attach comment to — prefer first task, else show error
    const targetTask = tasks[0]
    if (!targetTask) {
      toast.error('No tasks in this project yet. Add a task first to enable group chat.')
      return
    }

    setSending(true)
    try {
      const fd = new FormData()
      fd.append('content', message.trim() || (attachedFile ? attachedFile.name : ''))
      if (attachedFile) fd.append('attachment', attachedFile)

      const res = await api.upload(`/tasks/${targetTask.id}/comments`, fd)
      if (res.success) {
        setMessage('')
        setAttachedFile(null)
        await loadMessages(true)
      } else {
        toast.error(res.message || 'Failed to send')
      }
    } catch { toast.error('Cannot connect') }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return }
    setAttachedFile(f)
    e.target.value = ''
  }

  // ── Filtered projects ──────────────────────────────────────────────────────
  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Select project ─────────────────────────────────────────────────────────
  const selectProject = (p) => {
    setSelectedProject(p)
    setMobileView('chat')
    setMessages([])
  }

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 shadow-sm">

      {/* ── LEFT: Project Rooms Panel ──────────────────────────────────────── */}
      <div className={`
        flex-shrink-0 flex flex-col border-r border-gray-100 dark:border-dark-600
        w-full md:w-72 lg:w-80
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Hash size={16} className="text-primary-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Group Chats</h2>
                <p className="text-[10px] text-gray-400">{projects.length} project rooms</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={loadProjects}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
              title="Refresh rooms"
            >
              <RefreshCw size={13} />
            </motion.button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingProjects ? (
            <div className="flex justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No projects found</p>
            </div>
          ) : (
            filteredProjects.map(p => (
              <RoomCard
                key={p.id}
                project={p}
                selected={selectedProject?.id === p.id}
                onClick={() => selectProject(p)}
                unread={0}
              />
            ))
          )}
        </div>

        {/* Bottom: member count of selected */}
        {selectedProject && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50/50 dark:bg-dark-700/40">
            <div className="flex items-center gap-2">
              <Users size={12} className="text-gray-400" />
              <span className="text-[11px] text-gray-500">
                {members.length} member{members.length !== 1 ? 's' : ''} in <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedProject.name}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Chat Thread Panel ───────────────────────────────────────── */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${mobileView === 'rooms' ? 'hidden md:flex' : 'flex'}
      `}>

        {selectedProject ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-dark-600 bg-white dark:bg-dark-800">
              {/* Mobile back */}
              <button onClick={() => setMobileView('rooms')}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                <ChevronRight size={16} className="rotate-180" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Hash size={16} className="text-primary-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {selectedProject.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusColor(selectedProject.status)}`} />
                  <span className="text-[10px] text-gray-400">{statusLabel(selectedProject.status)}</span>
                  <span className="text-[10px] text-gray-300 dark:text-dark-500">·</span>
                  <Users size={9} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">{members.length} members</span>
                  <span className="text-[10px] text-gray-300 dark:text-dark-500">·</span>
                  <MessageSquare size={9} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400">{messages.length} messages</span>
                </div>
              </div>

              {/* Members avatars */}
              <div className="hidden sm:flex items-center -space-x-2">
                {members.slice(0, 4).map(m => (
                  <Avatar
                    key={m.id}
                    name={(m.first_name || '') + ' ' + (m.last_name || '')}
                    src={m.avatar_url}
                    size="xs"
                    animate={false}
                    className="ring-2 ring-white dark:ring-dark-800"
                  />
                ))}
                {members.length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center ring-2 ring-white dark:ring-dark-800">
                    <span className="text-[9px] font-bold text-gray-500">+{members.length - 4}</span>
                  </div>
                )}
              </div>

              {/* Refresh */}
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => loadMessages(true)}
                disabled={refreshing}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
              >
                <motion.div
                  animate={refreshing ? { rotate: 360 } : {}}
                  transition={{ duration: 0.7, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
                >
                  <RefreshCw size={13} />
                </motion.div>
              </motion.button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
                    <MessageSquare size={28} className="text-primary-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No messages yet</p>
                  <p className="text-xs text-gray-400 mt-1">Start the conversation for <span className="font-medium text-gray-600 dark:text-gray-300">{selectedProject.name}</span></p>
                  {tasks.length === 0 && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30">
                      <AlertCircle size={13} className="text-yellow-500 flex-shrink-0" />
                      <p className="text-[11px] text-yellow-700 dark:text-yellow-400">Add tasks to this project to enable messaging</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Date divider helper */}
                  {messages.map((msg, i) => {
                    const isMe = msg.author_id === user?.id ||
                      (msg.author_name && user?.name && msg.author_name === user.name)
                    const prev = messages[i - 1]
                    const msgDate = new Date(msg.created_at).toDateString()
                    const prevDate = prev ? new Date(prev.created_at).toDateString() : null
                    const showDate = msgDate !== prevDate

                    return (
                      <div key={msg.id}>
                        {/* Date divider */}
                        {showDate && (
                          <div className="flex items-center gap-3 my-3">
                            <div className="flex-1 h-px bg-gray-100 dark:bg-dark-600" />
                            <span className="text-[10px] font-semibold text-gray-400 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
                              {new Date(msg.created_at).toLocaleDateString('en-IN', {
                                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                              })}
                            </span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-dark-600" />
                          </div>
                        )}
                        {/* Task context badge */}
                        {msg._taskTitle && (i === 0 || messages[i-1]?._taskId !== msg._taskId) && (
                          <div className="flex justify-center my-2">
                            <span className="flex items-center gap-1.5 text-[10px] text-gray-400 px-3 py-1 rounded-full bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
                              <CheckCircle2 size={9} className="text-primary-400" />
                              Task: {msg._taskTitle}
                            </span>
                          </div>
                        )}
                        <MessageBubble msg={msg} isMe={isMe} />
                      </div>
                    )
                  })}
                  <div ref={chatBottomRef} />
                </>
              )}
            </div>

            {/* File preview */}
            <AnimatePresence>
              {attachedFile && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-4 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500/8 border border-primary-500/20 text-xs"
                >
                  <Paperclip size={11} className="text-primary-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{attachedFile.name}</span>
                  <span className="text-gray-400 flex-shrink-0">
                    {(attachedFile.size / 1024).toFixed(0)} KB
                  </span>
                  <button onClick={() => setAttachedFile(null)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-dark-600">
              <div className="flex items-end gap-2 bg-gray-50 dark:bg-dark-700 rounded-2xl border border-gray-200 dark:border-dark-600 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:border-primary-500/40 transition-all">
                {/* Attach */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1 rounded-lg text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0 mb-0.5"
                  title="Attach file"
                >
                  <Paperclip size={15} />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={tasks.length === 0 ? 'Add tasks to this project to start chatting…' : `Message #${selectedProject.name}…`}
                  disabled={tasks.length === 0}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none resize-none min-h-[24px] max-h-[120px] overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ lineHeight: '1.5' }}
                  onInput={e => {
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                />

                {/* Send */}
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={sending || (!message.trim() && !attachedFile) || tasks.length === 0}
                  className="p-2 rounded-xl bg-primary-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {sending
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    : <Send size={15} />
                  }
                </motion.button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-dark-600 text-gray-500 text-[9px] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-dark-600 text-gray-500 text-[9px] font-mono">Shift+Enter</kbd> for new line
              </p>
            </div>
          </>
        ) : (
          /* No project selected */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-primary-500/10 flex items-center justify-center mb-5">
              <Hash size={36} className="text-primary-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-2">Select a Project Room</h3>
            <p className="text-sm text-gray-400 max-w-xs">
              Choose a project from the left panel to start group messaging with your team.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupChats
