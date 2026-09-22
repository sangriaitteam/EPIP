import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, User, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'

const PMLogin = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)

  const { login, isAuthenticated, user } = useAuth()
  const { theme }                        = useTheme()
  const navigate                         = useNavigate()
  const isDark = theme === 'dark'

  // ── If already logged in as PM → redirect immediately ─────────────────────
  useEffect(() => {
    if (isAuthenticated && user?.role === 'project_manager') {
      navigate('/pm/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const card    = isDark ? 'bg-[#1a1d2e]'     : 'bg-white'
  const inputBg = isDark
    ? 'bg-[#12141f] border-[#2a2d3e] text-white placeholder-gray-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
  const labelC = isDark ? 'text-gray-300' : 'text-gray-700'
  const subTxt = isDark ? 'text-gray-400' : 'text-gray-500'

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim()) { toast.error('Enter your username'); return }
    if (!password)        { toast.error('Enter your password'); return }

    setLoading(true)
    const result = await login(username, password, 'project_manager')
    setLoading(false)

    if (result.success) {
      toast.success(`Welcome, ${result.user.name}! ✅`)
      // login() → saveUser() writes to localStorage synchronously
      // useEffect above will fire on next render and navigate
      // Belt-and-suspenders: also navigate directly
      navigate('/pm/dashboard', { replace: true })
    } else {
      toast.error(result.message || 'Invalid credentials')
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-[#0f1117]' : 'bg-[#f0f2f7]'}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30"
          >
            <FolderOpen size={24} className="text-white" />
          </motion.div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Project Manager
          </h1>
          <p className={`text-sm mt-1 ${subTxt}`}>Sangria Edutainment</p>
        </div>

        {/* Card */}
        <motion.div className={`rounded-2xl shadow-xl border ${isDark ? 'border-[#2a2d3e]' : 'border-gray-200'} ${card} p-8`}>
          <h2 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sign In</h2>
          <p className={`text-sm mb-6 ${subTxt}`}>Enter your credentials to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${labelC}`}>Username</label>
              <div className="relative">
                <User size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subTxt}`} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${inputBg}`}
                />
              </div>
              <p className={`text-[11px] mt-1 ${subTxt}`}>Username is provided by your Super Admin</p>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 uppercase tracking-wide ${labelC}`}>Password</label>
              <div className="relative">
                <Lock size={15} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${subTxt}`} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${inputBg}`}
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${subTxt} hover:opacity-80`}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="relative w-full overflow-hidden py-3 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25 disabled:opacity-60 mt-2"
            >
              <span className="flex items-center justify-center gap-2">
                {loading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  : <FolderOpen size={15} />
                }
                {loading ? 'Signing in…' : 'Sign In'}
              </span>
            </motion.button>
          </form>
        </motion.div>

        <button onClick={() => navigate('/login')}
          className={`flex items-center gap-1 mx-auto mt-4 text-xs ${subTxt} hover:text-blue-500 transition-colors`}>
          <ArrowLeft size={11} /> Back to main login
        </button>
      </motion.div>
    </div>
  )
}

export default PMLogin
