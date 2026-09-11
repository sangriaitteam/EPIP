import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

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

  // ── Login — Real backend ONLY ─────────────────────────────────────────────
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
        return { success: true, user: userData }
      }

      return { success: false, message: res.message || 'Invalid credentials', status: res.httpStatus }
    } catch {
      return { success: false, message: 'Cannot connect to server. Is the backend running?', status: 0 }
    }
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

  const logout = () => clearSession()

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
