import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Mail, KeyRound, Eye, EyeOff, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// Steps: 1 = Email, 2 = OTP, 3 = Create Password
const SuperAdminSetup = () => {
  const [step,      setStep]     = useState(1)
  const [loading,   setLoading]  = useState(false)
  const [showPass,  setShowPass] = useState(false)
  const [showConf,  setShowConf] = useState(false)

  const [name,      setName]     = useState('')
  const [email,     setEmail]    = useState('')
  const [otp,       setOtp]      = useState('')
  const [password,  setPassword] = useState('')
  const [confirm,   setConfirm]  = useState('')

  const navigate = useNavigate()

  // ── Step 1: Email → Request OTP ─────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!name.trim())                    { toast.error('Enter your name');          return }
    if (!email.includes('@'))            { toast.error('Enter a valid Gmail');       return }
    setLoading(true)
    const res = await api.post('/auth/superadmin/request-otp', { email, name })
    setLoading(false)
    if (res.success) {
      toast.success('OTP sent to your Gmail!')
      setStep(2)
    } else {
      toast.error(res.message || 'Request failed')
    }
  }

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Enter 6-digit OTP'); return }
    setLoading(true)
    const res = await api.post('/auth/superadmin/verify-otp', { email, otp })
    setLoading(false)
    if (res.success) {
      toast.success('OTP verified!')
      setStep(3)
    } else {
      toast.error(res.message || 'Invalid OTP')
    }
  }

  const handleResendOtp = async () => {
    setLoading(true)
    await api.post('/auth/superadmin/request-otp', { email, name })
    setLoading(false)
    toast.success('New OTP sent!')
  }

  // ── Step 3: Create Password ─────────────────────────────────────────────
  const handleCreatePassword = async () => {
    if (password.length < 8)      { toast.error('Password must be at least 8 characters'); return }
    if (password !== confirm)     { toast.error('Passwords do not match');                  return }
    setLoading(true)
    const res = await api.post('/auth/superadmin/create-password', { email, name, password })
    setLoading(false)
    if (res.success && res.data?.token) {
      localStorage.setItem('epip_token', res.data.token)
      const userData = {
        id:           res.data.user.id,
        email:        res.data.user.email,
        username:     res.data.user.username || '',
        role:         res.data.user.role,
        name:         res.data.user.name,
        isFirstLogin: false,
      }
      localStorage.setItem('epip_user', JSON.stringify(userData))
      toast.success('Welcome, Super Admin! 🎉')
      setTimeout(() => navigate('/admin/dashboard'), 1000)
    } else {
      toast.error(res.message || 'Failed to create account')
    }
  }

  const steps = [
    { title: 'Enter Your Gmail',     sub: 'OTP will be sent to verify your identity'  },
    { title: 'Verify OTP',           sub: `OTP sent to ${email || 'your Gmail'}`       },
    { title: 'Create Your Password', sub: 'Set a strong password for Super Admin access' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-900 dark:to-dark-800 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/30"
          >
            <Shield size={24} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Setup</h1>
          <p className="text-sm text-gray-400 mt-1">Sangria Edutainment Pvt Ltd</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <motion.div
                animate={{
                  backgroundColor: s < step ? '#22c55e' : s === step ? '#6366f1' : '#e5e7eb',
                  scale: s === step ? 1.15 : 1,
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              >
                {s < step ? <CheckCircle size={14} /> : s}
              </motion.div>
              {s < 3 && (
                <div className={`w-8 h-0.5 rounded ${s < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-dark-600'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-dark-600 p-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {steps[step - 1].title}
          </h2>
          <p className="text-sm text-gray-400 mb-6">{steps[step - 1].sub}</p>

          {/* ── Step 1: Email ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">
                  Gmail Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Only pre-authorized emails can access Super Admin setup.
                </p>
              </div>
              <motion.button
                onClick={handleRequestOtp}
                disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 shadow-lg shadow-primary-500/25 disabled:opacity-60"
              >
                {loading
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <><ArrowRight size={16} /> Send OTP to Gmail</>
                }
              </motion.button>
            </div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs text-primary-700 dark:text-primary-400">
                OTP sent to <strong>{email}</strong>. Check your inbox (and spam).
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">
                  6-digit OTP <span className="text-red-500">*</span>
                </label>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 text-xl sm:text-2xl text-center tracking-[0.3em] sm:tracking-[0.5em] rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>
              <motion.button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 shadow-lg disabled:opacity-60"
              >
                {loading
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <><CheckCircle size={16} /> Verify OTP</>
                }
              </motion.button>
              <button
                onClick={handleResendOtp}
                disabled={loading}
                className="w-full text-sm text-primary-500 hover:underline text-center"
              >
                Resend OTP
              </button>
            </div>
          )}

          {/* ── Step 3: Password ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-4 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button type="button" onClick={() => setShowConf(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
              <motion.button
                onClick={handleCreatePassword}
                disabled={loading || password !== confirm || password.length < 8}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-teal-600 shadow-lg disabled:opacity-60"
              >
                {loading
                  ? <RefreshCw size={16} className="animate-spin" />
                  : <><KeyRound size={16} /> Create Account & Login</>
                }
              </motion.button>
            </div>
          )}
        </motion.div>

        <p className="text-center mt-4 text-xs text-gray-400">
          Already have credentials?{' '}
          <button onClick={() => navigate('/login')} className="text-primary-500 hover:underline">
            Login here
          </button>
        </p>
      </motion.div>
    </div>
  )
}

export default SuperAdminSetup
