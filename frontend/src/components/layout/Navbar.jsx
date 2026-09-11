import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Sun, Moon, Search, Menu, ChevronDown, CheckCheck } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'
import { cn, formatDate } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

const notifIcons = {
  review:   '📋',
  task:     '✅',
  approval: '✔️',
  system:   '🔔',
  leave:    '📅',
}

const Navbar = ({ onMenuToggle }) => {
  const { theme, toggleTheme } = useTheme()
  const { user, logout }       = useAuth()
  const navigate               = useNavigate()

  const [notifOpen,    setNotifOpen]    = useState(false)
  const [profileOpen,  setProfileOpen]  = useState(false)
  const [notifications,setNotifications]= useState([])
  const [marking,      setMarking]      = useState(false)

  const notifRef   = useRef(null)
  const profileRef = useRef(null)

  const unread = notifications.filter(n => !n.is_read).length

  // Load real notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=20')
      if (res.success) setNotifications(res.data || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Mark all as read
  const markAllRead = async () => {
    if (unread === 0) return
    setMarking(true)
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
    setMarking(false)
  }

  // Mark single as read
  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // When bell opens, reload + mark read
  const handleBellClick = () => {
    setNotifOpen(o => !o)
    setProfileOpen(false)
    loadNotifications()
  }

  return (
    <header className="h-16 flex items-center px-4 gap-4 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-dark-600 z-20 flex-shrink-0">

      {/* Mobile menu */}
      <button onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search anything..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* ── Notifications ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-dark-600 z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</h3>
                  {unread > 0 && (
                    <span className="text-xs bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded-full font-medium">
                      {unread} new
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={marking}
                    className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    <CheckCheck size={13} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="mx-auto text-gray-300 dark:text-dark-500 mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markRead(n.id)
                        if (n.link) { navigate(n.link); setNotifOpen(false) }
                      }}
                      className={cn(
                        'px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors cursor-pointer',
                        !n.is_read && 'bg-primary-500/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-base mt-0.5 flex-shrink-0">
                          {notifIcons[n.type] || '🔔'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            !n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                          )}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatDate(n.created_at)}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 dark:border-dark-600 text-center">
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Profile ── */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <Avatar name={user?.name} src={user?.avatar_url || user?.employee?.avatar_url} size="sm" online={true} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">{user?.name}</span>
            <ChevronDown size={14} className="text-gray-400 hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-dark-600 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-600">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { navigate('/employee/profile'); setProfileOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  My Profile
                </button>
                <button
                  onClick={() => { logout(); navigate('/login') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}

export default Navbar
