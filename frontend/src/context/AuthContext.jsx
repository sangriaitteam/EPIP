import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Restore session on reload ────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('epip_user')
    const token  = localStorage.getItem('epip_token')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { clearSession() }
    }
    if (!stored && token) clearSession()
    setLoading(false)
  }, [])

  const clearSession = () => {
    setUser(null)
    localStorage.removeItem('epip_user')
    localStorage.removeItem('epip_token')
  }

  const saveUser = (userData) => {
    setUser(userData)
    localStorage.setItem('epip_user', JSON.stringify(userData))
  }

  // ── Auto check-out on browser/tab close (employee only) ─────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      const stored = localStorage.getItem('epip_user')
      if (!stored) return
      try {
        const userData = JSON.parse(stored)
        if (userData?.role === 'employee') {
          // Use sendBeacon for reliable fire-and-forget on tab close
          const token = localStorage.getItem('epip_token')
          if (!token) return
          const API = import.meta.env.VITE_API_URL ||
            (import.meta.env.PROD ? '/api' : `${window.location.protocol}//${window.location.hostname}:5000/api`)
          // sendBeacon — guaranteed to fire even on tab close
          // Token sent in body as _token (sendBeacon can't set headers)
          navigator.sendBeacon(
            `${API}/attendance/check-out`,
            new Blob([JSON.stringify({ _token: token })], { type: 'application/json' })
          )
        }
      } catch { /* silent */ }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
  // Returns { locked, warning } so Login page can show appropriate message
  const _autoCheckIn = async () => {
    try {
      const res = await api.post('/attendance/check-in', { work_mode: 'office' })
      if (res.success && res.data?.warning) {
        // Show warning toast — re-login detected
        toast(`${res.data.warning.message}`, {
          icon: '⚠️',
          duration: 6000,
          style: { background: '#fef3c7', color: '#92400e', fontWeight: 600 },
        })
      }
      return { locked: false }
    } catch (err) {
      if (err?.response?.status === 423 || err?.message?.includes('423')) {
        return { locked: true, message: err?.response?.data?.message || 'Attendance locked for today' }
      }
      // 409 = already checked in today — fine
      return { locked: false }
    }
  }

  // ── Auto check-out (employee only, silent) ────────────────────────────────
  const _autoCheckOut = async () => {
    try {
      await api.post('/attendance/check-out', {})
      console.log('[auth] Auto check-out done')
    } catch {
      // Not checked in, or already checked out — ignore silently
    }
  }  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (loginId, password, expectedRole) => {
    try {
      const body = loginId.includes('@')
        ? { email: loginId, password, expectedRole }
        : { username: loginId, password, expectedRole }

      const res = await api.post('/auth/login', body)

      if (res.success && res.data?.token) {
        localStorage.setItem('epip_token', res.data.token)
        const userData = {
          id:           res.data.user.id,
          email:        res.data.user.email  || '',
          username:     res.data.user.username || '',
          role:         res.data.user.role,
          name:         res.data.user.name,
          isFirstLogin: res.data.user.isFirstLogin ?? false,
          employee:     res.data.employee || null,
        }
        saveUser(userData)

        // Auto check-in for employees only
        if (userData.role === 'employee') {
          const checkInResult = await _autoCheckIn()
          if (checkInResult.locked) {
            // Day is locked — still allow login to website but show prominent warning
            toast.error(
              checkInResult.message || 'Your attendance for today is locked. Contact admin.',
              { duration: 8000, icon: '🔒' }
            )
          }
        }

        return { success: true, user: userData }
      }

      return { success: false, message: res.message || 'Invalid credentials', status: res.httpStatus }
    } catch {
      return { success: false, message: 'Cannot connect to server. Is the backend running?', status: 0 }
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    // Auto check-out for employees before clearing session
    const stored = localStorage.getItem('epip_user')
    if (stored) {
      try {
        const userData = JSON.parse(stored)
        if (userData?.role === 'employee') {
          await _autoCheckOut()
        }
      } catch { /* ignore */ }
    }
    clearSession()
  }

  // ── Mark first login complete ────────────────────────────────────────────
  const completeFirstLogin = () => {
    if (!user) return
    const updated = { ...user, isFirstLogin: false }
    saveUser(updated)
  }

  // ── Update avatar URL everywhere ─────────────────────────────────────────
  const updateAvatar = (avatarUrl) => {
    if (!user) return
    const updated = {
      ...user,
      avatar_url: avatarUrl,
      employee: user.employee ? { ...user.employee, avatar_url: avatarUrl } : user.employee,
    }
    saveUser(updated)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAuthenticated: !!user,
      completeFirstLogin,
      updateAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
