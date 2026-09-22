import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Sun, Moon, ShieldCheck, Timer, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import sangriaLogo from '../../assets/sangria.png'
import toast from 'react-hot-toast'

// Roles — Employee uses username, Admin uses username, Super Admin uses email
const ROLES = [
  { label: 'Employee',        isUsername: true  },
  { label: 'Admin',           isUsername: true  },
  { label: 'Super Admin',     isUsername: false },
  { label: 'Project Manager', isUsername: true  },
]

const Login = () => {
  const [selectedRole, setSelectedRole] = useState(0)
  const [loginId,      setLoginId]      = useState('')
  const [password,     setPassword]     = useState('')
  const [showPw,       setShowPw]       = useState(false)
  const [remember,     setRemember]     = useState(false)
  const [loading,      setLoading]      = useState(false)

  // ── Lock state ────────────────────────────────────────────────────────────
  const [locked,        setLocked]        = useState(false)      // account locked
  const [lockSeconds,   setLockSeconds]   = useState(0)          // countdown seconds
  const [attemptsLeft,  setAttemptsLeft]  = useState(null)       // null = unknown
  const lockTimerRef = useRef(null)

  const { login }              = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate               = useNavigate()

  const isUsername = ROLES[selectedRole].isUsername

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (locked && lockSeconds > 0) {
      lockTimerRef.current = setInterval(() => {
        setLockSeconds(s => {
          if (s <= 1) {
            clearInterval(lockTimerRef.current)
            setLocked(false)
            setAttemptsLeft(null)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => clearInterval(lockTimerRef.current)
  }, [locked, lockSeconds])

  const fmtCountdown = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`
  }

  const handleRoleSelect = (idx) => {
    setSelectedRole(idx)
    setLoginId('')
    setPassword('')
    // Clear lock state when switching roles
    setLocked(false)
    setLockSeconds(0)
    setAttemptsLeft(null)
    clearInterval(lockTimerRef.current)
  }

  const handleLogin = async (e) => {
    e?.preventDefault()

    // Block if locked
    if (locked) return

    if (!loginId || !password) {
      toast.error(`Please enter your ${isUsername ? 'username' : 'email'} and password`)
      return
    }

    const roleMap      = { 0: 'employee', 1: 'hr', 2: 'admin', 3: 'project_manager' }
    const expectedRole = roleMap[selectedRole]

    setLoading(true)
    const result = await login(loginId, password, expectedRole)
    setLoading(false)

    if (result.success) {
      setLocked(false)
      setAttemptsLeft(null)
      toast.success(`Welcome back, ${result.user.name}! ✅`)
      if (result.user.isFirstLogin &&
          (result.user.role === 'employee' || result.user.role === 'hr')) {
        navigate('/employee/verify-documents')
        return
      }
      const map = {
        admin:           '/admin/dashboard',
        hr:              '/hr/dashboard',
        employee:        '/employee/dashboard',
        project_manager: '/pm/dashboard',
      }
      navigate(map[result.user.role])
    } else {
      // ── Handle 423 Locked ─────────────────────────────────────────────
      if (result.status === 423) {
        // Extract remaining seconds from message e.g. "... 14 minutes ..."
        const minsMatch = result.message?.match(/(\d+)\s*minute/)
        const secsMatch = result.message?.match(/(\d+)\s*second/)
        let secs = 15 * 60  // default 15 min
        if (minsMatch) secs = parseInt(minsMatch[1]) * 60
        else if (secsMatch) secs = parseInt(secsMatch[1])

        setLocked(true)
        setLockSeconds(secs)
        setAttemptsLeft(0)
        toast.error('🔒 Account locked — too many failed attempts', { duration: 5000 })
      } else {
        // ── Extract attempts remaining from message ────────────────────
        const attemptsMatch = result.message?.match(/(\d+)\s*attempt/)
        if (attemptsMatch) {
          setAttemptsLeft(parseInt(attemptsMatch[1]))
        }
        toast.error(result.message || 'Invalid credentials.')
      }
    }
  }

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const isDark      = theme === 'dark'
  const page        = isDark ? 'bg-[#0f1117]'     : 'bg-[#f0f2f7]'
  const card        = isDark ? 'bg-[#1a1d2e]'     : 'bg-white'
  const divider     = isDark ? 'border-[#2a2d3e]' : 'border-gray-200'
  const inputBg     = isDark
    ? 'bg-[#12141f] border-[#2a2d3e] text-white placeholder-gray-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
  const labelC      = isDark ? 'text-gray-300' : 'text-gray-700'
  const subTxt      = isDark ? 'text-gray-400' : 'text-gray-500'
  const headTxt     = isDark ? 'text-white'    : 'text-gray-900'
  const roleBtnBase = isDark
    ? 'bg-[#12141f] border border-[#2a2d3e] text-gray-300 hover:bg-[#1e2135]'
    : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
  const toggleBtn   = isDark
    ? 'bg-[#1e2135] text-yellow-400 hover:bg-[#252840]'
    : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${page}`}>

      {/* Theme toggle */}
      <motion.button
        onClick={toggleTheme}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.92 }}
        className={`fixed top-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 ${toggleBtn}`}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </motion.button>

      {/* ── Sign In Card ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border ${divider} ${card}`}
      >
        <div className="p-5 sm:p-8 md:p-10">

          {/* Logo + Company */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center flex-shrink-0">
              <img src={sangriaLogo} alt="Sangria" className="w-full h-full object-contain" />
            </div>
            <p className={`font-bold text-sm sm:text-base leading-tight ${headTxt}`}>
              Sangria Edutainment Pvt Ltd
            </p>
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h2 className={`text-xl sm:text-2xl font-bold ${headTxt}`}>Sign In</h2>
            <p className={`text-xs sm:text-sm mt-1 ${subTxt}`}>Choose your role and enter your credentials</p>
          </div>

          {/* Role selector — 2 cols on xs, 4 cols on sm+ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {ROLES.map((r, i) => {
              const isActive = selectedRole === i
              return (
                <motion.button
                  key={r.label}
                  onClick={() => handleRoleSelect(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`py-2 px-2 sm:py-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 border ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white border-transparent shadow-lg shadow-primary-500/25'
                      : roleBtnBase
                  }`}
                >
                  {r.label}
                </motion.button>
              )
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">

            {/* Username (Employee) OR Email (others) */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${labelC}`}>
                {isUsername ? 'Username' : 'Email Address'}
              </label>
              <div className="relative">
                {isUsername
                  ? <User size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subTxt}`} />
                  : <Mail size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subTxt}`} />
                }
                <input
                  type={isUsername ? 'text' : 'email'}
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder={isUsername ? 'Enter your username' : 'you@company.com'}
                  autoComplete={isUsername ? 'username' : 'email'}
                  className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${inputBg}`}
                />
              </div>
              {isUsername && (
                <p className={`text-[11px] mt-1 ${subTxt}`}>
                  Username is provided by your Admin
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${labelC}`}>
                Password
              </label>
              <div className="relative">
                <Lock size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subTxt}`} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all ${inputBg}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${subTxt} hover:opacity-80 transition-opacity`}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-primary-500 cursor-pointer"
                />
                <span className={`text-xs ${subTxt}`}>Remember me</span>
              </label>
              <button type="button" className="text-xs text-primary-500 hover:text-primary-400 font-medium transition-colors">
                Forgot password?
              </button>
            </div>

            {/* ── Lock Banner ── */}
            <AnimatePresence>
              {locked && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0,  scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25"
                >
                  <Timer size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      Account Locked
                    </p>
                    <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-0.5">
                      Too many failed attempts. Try again in{' '}
                      <strong className="tabular-nums">{fmtCountdown(lockSeconds)}</strong>
                    </p>
                  </div>
                  {/* Countdown ring */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-red-500 tabular-nums leading-none">
                      {fmtCountdown(lockSeconds)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Attempts warning ── */}
            <AnimatePresence>
              {!locked && attemptsLeft !== null && attemptsLeft > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium ${
                    attemptsLeft <= 5
                      ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                      : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                  }`}
                >
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  <span>
                    Invalid credentials.{' '}
                    <strong>{attemptsLeft}</strong> attempt{attemptsLeft !== 1 ? 's' : ''} remaining before account is locked.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sign In button */}
            <motion.button
              type="submit"
              disabled={loading || locked}
              whileHover={{ scale: locked ? 1 : 1.02, y: locked ? 0 : -1 }}
              whileTap={{ scale: locked ? 1 : 0.98 }}
              className="relative w-full py-3 rounded-xl text-sm font-semibold text-white overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: locked ? '#ef4444' : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : locked ? (
                  <Timer size={15} />
                ) : <ShieldCheck size={15} />}
                {loading ? 'Signing in…' : locked ? `Locked · ${fmtCountdown(lockSeconds)}` : 'Sign In Securely'}
              </span>
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center space-y-2">
            {/* SuperAdmin setup link — only on Super Admin tab */}
            {selectedRole === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className={`text-xs ${subTxt} mb-1`}>New Super Admin? Don't have a password yet?</p>
                <button
                  type="button"
                  onClick={() => navigate('/superadmin/setup')}
                  className="text-xs text-primary-500 hover:underline font-medium"
                >
                  Setup Super Admin Account →
                </button>
              </motion.div>
            )}
            <button
              type="button"
              onClick={() => navigate('/home')}
              className={`text-[11px] ${subTxt} hover:text-primary-500 transition-colors flex items-center gap-1 mx-auto`}
            >
              <ArrowLeft size={11} /> Back to Home
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  )
}

export default Login
