import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckSquare, TrendingUp, Calendar,
  AlertCircle, Play, Square, LogIn, LogOut,
  PauseCircle, PlayCircle, X, Coffee, Utensils, Users, User, MoreHorizontal
} from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import ProgressBar from '../../components/common/ProgressBar'
import Badge from '../../components/common/Badge'
import { AttendanceBarChart } from '../../components/charts/PerformanceChart'
import { attendanceService } from '../../services/attendanceService'
import { api } from '../../services/api'
import { formatDate, getStatusColor, getPriorityColor, capitalize } from '../../utils/helpers'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

// ── Pause reasons ─────────────────────────────────────────────────────────────
const PAUSE_REASONS = [
  { value: 'tea_break',    label: 'Tea Break',    icon: Coffee },
  { value: 'lunch_break',  label: 'Lunch Break',  icon: Utensils },
  { value: 'meeting',      label: 'Meeting',      icon: Users },
  { value: 'personal',     label: 'Personal Work',icon: User },
  { value: 'other',        label: 'Other',        icon: MoreHorizontal },
]

// ── Pause Reason Modal ────────────────────────────────────────────────────────
const PauseModal = ({ onClose, onConfirm, loading }) => {
  const [reason,  setReason]  = useState('tea_break')
  const [comment, setComment] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <PauseCircle size={18} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Start Break</h3>
              <p className="text-xs text-gray-400">Select a reason to pause work timer</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={15} />
          </button>
        </div>

        {/* Reason grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAUSE_REASONS.map(r => {
            const Icon = r.icon
            const sel  = reason === r.value
            return (
              <button key={r.value} onClick={() => setReason(r.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  sel
                    ? 'border-yellow-400 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                    : 'border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:border-yellow-300'
                }`}>
                <Icon size={14} className={sel ? 'text-yellow-500' : 'text-gray-400'} />
                <span className="truncate">{r.label}</span>
              </button>
            )
          })}
        </div>

        {/* Optional comment */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Additional note (optional)
          </label>
          <input
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="e.g. Client call, quick errand…"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-600
              bg-white dark:bg-dark-700 text-gray-900 dark:text-white
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600
              text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            Cancel
          </button>
          <motion.button onClick={() => onConfirm(reason, comment)} disabled={loading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="py-2.5 rounded-xl text-sm font-semibold text-white bg-yellow-500
              hover:bg-yellow-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <><PauseCircle size={15} /> Start Break</>
            }
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}


// ── Main Dashboard ────────────────────────────────────────────────────────────
// ── Main Dashboard ────────────────────────────────────────────────────────────
const EmployeeDashboard = () => {
  const [checkedIn,     setCheckedIn]     = useState(false)
  const [paused,        setPaused]        = useState(false)   // currently on break?
  const [activePause,   setActivePause]   = useState(null)    // active pause record
  const [todayRecord,   setTodayRecord]   = useState(null)
  const [currentTime,   setCurrentTime]   = useState(new Date())
  const [tasks,         setTasks]         = useState([])
  const [summary,       setSummary]       = useState(null)
  const [weeklyData,    setWeeklyData]    = useState([])
  const [notifs,        setNotifs]        = useState([])
  const [checkingIn,    setCheckingIn]    = useState(false)
  const [pausing,       setPausing]       = useState(false)
  const [showPauseModal,setShowPauseModal]= useState(false)

  // ── Load today's attendance + active pause ────────────────────────────────
  const loadToday = async () => {
    try {
      const [todayRes, pausesRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/pauses'),
      ])
      if (todayRes.success && todayRes.data) {
        const rec = todayRes.data
        setTodayRecord(rec)
        setCheckedIn(!!(rec.check_in && !rec.check_out))
      }
      if (pausesRes.success) {
        const open = (pausesRes.data || []).find(p => !p.pause_end)
        if (open) { setPaused(true); setActivePause(open) }
        else      { setPaused(false); setActivePause(null) }
      }
    } catch {}
  }

  useEffect(() => {
    loadToday()
    api.get('/tasks/my').then(res => {
      if (res.success && res.data?.length) setTasks(res.data)
    }).catch(() => {})
    attendanceService.getSummary().then(d => { if (d) setSummary(d) }).catch(() => {})
    api.get('/notifications?limit=5').then(res => { if (res.success) setNotifs(res.data || []) }).catch(() => {})
    // Weekly chart data
    const now = new Date()
    attendanceService.getWeekly(now.getFullYear(), now.getMonth() + 1)
      .then(d => { if (d?.length) setWeeklyData(d) }).catch(() => {})
  }, [])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Check In / Check Out ──────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setCheckingIn(true)
    try {
      if (!checkedIn) {
        const res = await api.post('/attendance/check-in', { work_mode: 'office' })
        if (res.success) {
          setTodayRecord(res.data)
          setCheckedIn(true)
          const time = new Date(res.data.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          toast.success(`✅ Checked in at ${time}`)
        } else { toast.error(res.message || 'Check-in failed') }
      } else {
        const res = await api.post('/attendance/check-out')
        if (res.success) {
          setTodayRecord(res.data)
          setCheckedIn(false)
          setPaused(false)
          setActivePause(null)
          const time  = new Date(res.data.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
          const hours = res.data.hours_worked
          toast.success(`👋 Checked out at ${time} · ${hours}h worked`)
        } else { toast.error(res.message || 'Check-out failed') }
      }
    } catch { toast.error('Cannot connect to server') }
    setCheckingIn(false)
  }

  // ── Pause ─────────────────────────────────────────────────────────────────
  const handlePause = async (reason, comment) => {
    setPausing(true)
    try {
      const res = await api.post('/attendance/pause', { reason, comment })
      if (res.success) {
        setPaused(true)
        setActivePause(res.data)
        setShowPauseModal(false)
        const label = PAUSE_REASONS.find(r => r.value === reason)?.label || reason
        toast.success(`⏸ Break started — ${label}`)
      } else { toast.error(res.message || 'Pause failed') }
    } catch { toast.error('Cannot connect to server') }
    setPausing(false)
  }

  // ── Resume ────────────────────────────────────────────────────────────────
  const handleResume = async () => {
    setPausing(true)
    try {
      const res = await api.post('/attendance/resume')
      if (res.success) {
        setPaused(false)
        setActivePause(null)
        const mins = Math.round(res.data.duration_mins || 0)
        toast.success(`▶ Resumed work — break was ${mins} min`)
        loadToday()
      } else { toast.error(res.message || 'Resume failed') }
    } catch { toast.error('Cannot connect to server') }
    setPausing(false)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmtTime = ts => ts
    ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const calcDuration = (from) => {
    if (!from) return null
    const diff = Math.floor((Date.now() - new Date(from)) / 1000)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`
  }

  const myTasks      = tasks.slice(0, 4)
  const unreadNotifs = notifs.filter(n => !n.is_read).slice(0, 3)
  const timeStr      = currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr      = currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Net working duration (excludes pause time)
  const workDuration = (checkedIn && !paused && todayRecord?.check_in)
    ? calcDuration(todayRecord.check_in)
    : null

  // How long the current break has been
  const pauseDuration = (paused && activePause?.pause_start)
    ? calcDuration(activePause.pause_start)
    : null

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header — Check In / Pause / Resume */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Good morning 👋</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{dateStr}</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Clock */}
          <div className="text-right">
            <p className="text-lg sm:text-xl font-mono font-bold text-gray-900 dark:text-white tabular-nums">{timeStr}</p>
            <p className="text-xs text-gray-400">Live time</p>
          </div>

          {/* Pause / Resume button — only visible when checked in & not checked out */}
          <AnimatePresence>
            {checkedIn && (
              <motion.button
                key="pause-btn"
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={paused ? handleResume : () => setShowPauseModal(true)}
                disabled={pausing}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg whitespace-nowrap disabled:opacity-70 ${
                  paused
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/30'
                }`}
              >
                {pausing
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  : paused
                  ? <><PlayCircle size={15} /> Resume</>
                  : <><PauseCircle size={15} /> Break</>
                }
              </motion.button>
            )}
          </AnimatePresence>

          {/* Check In / Check Out */}
          <motion.button
            onClick={handleCheckIn}
            disabled={checkingIn}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg whitespace-nowrap disabled:opacity-70 ${
              checkedIn
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30'
            }`}
          >
            {checkingIn
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : checkedIn
              ? <><Square size={15} /> Check Out</>
              : <><Play size={15} /> Check In</>
            }
          </motion.button>
        </div>
      </motion.div>

      {/* Break in progress banner */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl
              bg-yellow-500/10 border border-yellow-500/30"
          >
            <div className="flex items-center gap-3">
              <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <PauseCircle size={20} className="text-yellow-500" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  On Break — {PAUSE_REASONS.find(r => r.value === activePause?.reason)?.label || 'Break'}
                </p>
                <p className="text-xs text-yellow-600/70 dark:text-yellow-500/70">
                  Work timer paused · {pauseDuration ? `${pauseDuration} elapsed` : 'Just started'}
                  {activePause?.comment ? ` · ${activePause.comment}` : ''}
                </p>
              </div>
            </div>
            <motion.button onClick={handleResume} disabled={pausing}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                text-white bg-green-500 hover:bg-green-600 disabled:opacity-60 transition-colors">
              <PlayCircle size={13} /> Resume
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Attendance"     value={summary ? `${summary.attendance_percent ?? summary.attendancePercent ?? 0}%` : '—'} subtitle="This month"  icon={Clock}       color="green"   delay={0.1} />
        <StatCard title="Tasks Active"   value={myTasks.filter(t => t.status === 'in_progress').length || '—'}  subtitle="In progress" icon={CheckSquare} color="blue"    delay={0.2} />
        <StatCard title="Days Present"   value={summary?.present ?? '—'}  subtitle="This month" icon={TrendingUp}  color="primary" delay={0.3} />
      </div>

      {/* Middle row */}
      <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Today attendance */}
        <motion.div variants={item}>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Today's Attendance</p>
                <Badge
                  label={
                    paused         ? 'on break'      :
                    checkedIn      ? 'present'       :
                    todayRecord?.check_out ? 'completed'  :
                    todayRecord?.check_in  ? 'present'    : 'not checked in'
                  }
                  color={
                    paused         ? 'text-yellow-600 bg-yellow-500/10' :
                    checkedIn || todayRecord?.check_in
                      ? 'text-green-500 bg-green-500/10'
                      : 'text-gray-400 bg-gray-500/10'
                  }
                  dot
                />
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><LogIn size={13} className="text-green-500" /> Check In</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{fmtTime(todayRecord?.check_in)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><LogOut size={13} className="text-red-500" /> Check Out</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {todayRecord?.check_out
                      ? fmtTime(todayRecord.check_out)
                      : checkedIn
                      ? <span className={`text-xs animate-pulse ${paused ? 'text-yellow-500' : 'text-green-500'}`}>
                          {paused ? 'On break…' : 'In office…'}
                        </span>
                      : '—'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><Clock size={13} className="text-blue-500" /> Hours</span>
                  <span className="font-semibold text-gray-800 dark:text-white">
                    {todayRecord?.hours_worked
                      ? `${todayRecord.hours_worked}h`
                      : workDuration
                      ? <span className="text-green-600 dark:text-green-400">{workDuration}</span>
                      : '—'
                    }
                  </span>
                </div>
                {/* Pause info row */}
                {todayRecord?.total_pause_mins > 0 && (
                  <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><PauseCircle size={13} className="text-yellow-500" /> Break time</span>
                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                      {Math.round(todayRecord.total_pause_mins)} min
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><Calendar size={13} className="text-purple-500" /> Date</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                    {currentTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <ProgressBar value={summary?.attendance_percent ?? summary?.attendancePercent ?? 0} className="mt-3" color="bg-green-500" />
            </CardBody>
          </Card>
        </motion.div>

        {/* Month summary */}
        <motion.div variants={item}>
          <Card>
            <CardBody>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                {new Date().toLocaleString('en-IN', { month: 'long' })} Summary
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Present', value: summary?.present     ?? '—', color: 'text-green-500',  bg: 'bg-green-500/10' },
                  { label: 'Leave',   value: summary?.leave       ?? '—', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                  { label: 'Late',    value: summary?.late        ?? '—', color: 'text-orange-500', bg: 'bg-orange-500/10' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.4 + i * 0.1 }}
                    className={`p-2 rounded-xl ${s.bg}`}>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value ?? '—'}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>OT: <strong className="text-gray-700 dark:text-gray-200">{summary?.total_overtime ?? 0}h</strong></span>
                <span>Absent: <strong className="text-red-500">{summary?.absent ?? '—'}</strong></span>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Alerts */}
        <motion.div variants={item}>
          <Card>
            <CardBody>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Recent Alerts</p>
              <div className="space-y-2">
                {unreadNotifs.length === 0
                  ? <p className="text-xs text-gray-400 text-center py-4">No new alerts</p>
                  : unreadNotifs.map((n, i) => (
                    <motion.div key={n.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="flex items-start gap-2 p-2 rounded-xl bg-primary-500/5 border border-primary-500/10">
                      <AlertCircle size={14} className="text-primary-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{n.message}</p>
                      </div>
                    </motion.div>
                  ))
                }
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="overflow-hidden" delay={0.3}>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Attendance Overview</h3>
            <p className="text-xs text-gray-400 mt-0.5">Weekly breakdown this month</p>
          </CardHeader>
          <CardBody className="pt-2 px-2 sm:px-4">
            {weeklyData.length > 0
              ? <AttendanceBarChart data={weeklyData} />
              : <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                  No attendance data yet this month
                </div>
            }
          </CardBody>
        </Card>
        <Card className="overflow-hidden" delay={0.4}>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Monthly Summary</h3>
            <p className="text-xs text-gray-400 mt-0.5">This month at a glance</p>
          </CardHeader>
          <CardBody className="pt-4 px-4">
            {summary ? (
              <div className="space-y-3">
                {[
                  { label: 'Attendance Rate', value: `${summary.attendance_percent ?? 0}%`, color: 'bg-green-500', pct: summary.attendance_percent ?? 0 },
                  { label: 'Present Days',    value: `${summary.present ?? 0} days`,        color: 'bg-blue-500',  pct: Math.min(100, ((summary.present ?? 0) / 26) * 100) },
                  { label: 'Overtime Hours',  value: `${summary.total_overtime ?? 0}h`,     color: 'bg-purple-500',pct: Math.min(100, ((summary.total_overtime ?? 0) / 20) * 100) },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{item.value}</span>
                    </div>
                    <ProgressBar value={item.pct} color={item.color} size="sm" showPercent={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-gray-400">
                No summary data yet
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Tasks */}
      <div className="grid grid-cols-1 gap-6">
        <Card delay={0.5}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">My Tasks</h3>
              <a href="/employee/tasks" className="text-xs text-primary-500 hover:underline">View all</a>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {myTasks.length === 0
              ? <p className="text-xs text-gray-400 text-center py-6">No tasks assigned yet</p>
              : myTasks.map((task, i) => (
              <motion.div key={task.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }} whileHover={{ x: 4 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-700
                  hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                    <Badge label={task.priority} color={getPriorityColor(task.priority)} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge label={capitalize((task.status || '').replace('_', ' '))} color={getStatusColor(task.status)} dot />
                    <span className="text-xs text-gray-400">Due {formatDate(task.due_date || task.dueDate)}</span>
                  </div>
                  <ProgressBar value={task.completion_percent ?? task.completionPercent ?? 0} size="sm" className="mt-2" showPercent={false} />
                </div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {task.completion_percent ?? task.completionPercent ?? 0}%
                </span>
              </motion.div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Pause reason modal */}
      <AnimatePresence>
        {showPauseModal && (
          <PauseModal
            onClose={() => setShowPauseModal(false)}
            onConfirm={handlePause}
            loading={pausing}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default EmployeeDashboard
