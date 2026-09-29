import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Calendar, TrendingUp, ChevronLeft, ChevronRight,
  Plus, X, AlertCircle, CheckCircle, Trash2,
  PauseCircle, Coffee, Utensils, Users, User, MoreHorizontal, Lock,
  Monitor, MonitorOff, LogIn, LogOut
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
import { AttendanceBarChart } from '../../components/charts/PerformanceChart'
import { attendanceService } from '../../services/attendanceService'
import { api } from '../../services/api'
import { formatDate, getStatusColor, capitalize } from '../../utils/helpers'
import toast from 'react-hot-toast'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid']

const statusColors = {
  present: 'bg-green-500 text-white',
  absent:  'bg-red-500 text-white',
  late:    'bg-orange-400 text-white',
  leave:   'bg-yellow-400 text-white',
}

const leaveStatusColor = (s) => {
  if (s === 'approved')  return 'bg-green-500/10 text-green-600'
  if (s === 'rejected')  return 'bg-red-500/10 text-red-600'
  return 'bg-yellow-500/10 text-yellow-600'
}

// ── Pause helpers ─────────────────────────────────────────────────────────────
const PAUSE_REASON_MAP = {
  tea_break:    { label: 'Tea Break',       icon: Coffee,        color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',  section: 'manual' },
  lunch_break:  { label: 'Lunch Break',     icon: Utensils,      color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', section: 'manual' },
  meeting:      { label: 'Meeting',         icon: Users,         color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',        section: 'manual' },
  personal:     { label: 'Personal Work',   icon: User,          color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', section: 'manual' },
  other:        { label: 'Other',           icon: MoreHorizontal,color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',       section: 'manual' },
  screen_lock:  { label: 'Screen Off',      icon: Lock,          color: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',    section: 'screen' },
}

const fmtPauseTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'

const fmtDuration = (mins) => {
  if (!mins && mins !== 0) return '—'
  const m = Math.round(mins)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ── Pause History Panel ───────────────────────────────────────────────────────
const PauseHistoryPanel = ({ attendanceId, date }) => {
  const [pauses,  setPauses]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!attendanceId) { setLoading(false); return }
    api.get(`/attendance/pauses/${attendanceId}`)
      .then(res => { if (res.success) setPauses(res.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [attendanceId])

  if (loading) return (
    <div className="flex justify-center py-6">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  if (!pauses.length) return (
    <p className="text-xs text-gray-400 text-center py-4">No breaks recorded for this day</p>
  )

  const totalMins = pauses.reduce((s, p) => s + (p.duration_mins || 0), 0)

  return (
    <div className="space-y-2">
      {pauses.map((p, i) => {
        const meta   = PAUSE_REASON_MAP[p.reason] || PAUSE_REASON_MAP.other
        const Icon   = meta.icon
        const isOpen = !p.pause_end
        return (
          <motion.div key={p.id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              isOpen
                ? 'bg-yellow-500/5 border-yellow-500/20'
                : 'bg-gray-50 dark:bg-dark-700 border-gray-100 dark:border-dark-600'
            }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{meta.label}</span>
                {isOpen && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 animate-pulse">
                    Active
                  </span>
                )}
                {p.comment && (
                  <span className="text-xs text-gray-400 italic truncate">"{p.comment}"</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span>Start: <strong className="text-gray-700 dark:text-gray-300">{fmtPauseTime(p.pause_start)}</strong></span>
                <span>End: <strong className="text-gray-700 dark:text-gray-300">{isOpen ? <span className="text-yellow-500">—</span> : fmtPauseTime(p.pause_end)}</strong></span>
                <span className={`font-semibold ${isOpen ? 'text-yellow-500' : 'text-primary-500'}`}>
                  {isOpen ? 'In progress' : fmtDuration(p.duration_mins)}
                </span>
              </div>
            </div>
          </motion.div>
        )
      })}
      {/* Total summary */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary-500/5 border border-primary-500/10 mt-1">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Total break time</span>
        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{fmtDuration(totalMins)}</span>
      </div>
    </div>
  )
}

// ── Today's Breaks Panel (used in Breaks tab) ─────────────────────────────────
const TodayBreaksPanel = () => {
  const [pauses,  setPauses]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/attendance/pauses')
      .then(res => { if (res.success) setPauses(res.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-4">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  if (!pauses.length) return (
    <p className="text-xs text-gray-400 text-center py-6">No breaks recorded today</p>
  )

  // Split into manual vs screen-off breaks
  const manualBreaks = pauses.filter(p => p.reason !== 'screen_lock')
  const screenBreaks = pauses.filter(p => p.reason === 'screen_lock')
  const totalMins    = pauses.reduce((s, p) => s + (p.duration_mins || 0), 0)
  const manualMins   = manualBreaks.reduce((s, p) => s + (p.duration_mins || 0), 0)
  const screenMins   = screenBreaks.reduce((s, p) => s + (p.duration_mins || 0), 0)

  const BreakItem = ({ p }) => {
    const meta   = PAUSE_REASON_MAP[p.reason] || PAUSE_REASON_MAP.other
    const Icon   = meta.icon
    const isOpen = !p.pause_end
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 p-3 rounded-xl border ${
          isOpen
            ? 'bg-yellow-500/5 border-yellow-500/25'
            : 'bg-gray-50 dark:bg-dark-700 border-gray-100 dark:border-dark-600'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{meta.label}</span>
            {isOpen && <span className="text-[10px] font-bold text-yellow-500 animate-pulse">● Active</span>}
            {p.comment && <span className="text-[10px] text-gray-400 italic truncate">"{p.comment}"</span>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            <span>{fmtPauseTime(p.pause_start)} → {isOpen ? <span className="text-yellow-500">ongoing</span> : fmtPauseTime(p.pause_end)}</span>
            <span className="font-bold text-primary-500">{isOpen ? '—' : fmtDuration(p.duration_mins)}</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Section 1: Manual Breaks ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PauseCircle size={14} className="text-primary-500" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Manual Breaks</span>
            <span className="text-[10px] text-gray-400">({manualBreaks.length})</span>
          </div>
          {manualMins > 0 && (
            <span className="text-xs font-semibold text-primary-500">{fmtDuration(manualMins)}</span>
          )}
        </div>

        {manualBreaks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 dark:bg-dark-700 rounded-xl border border-dashed border-gray-200 dark:border-dark-600">
            No manual breaks today
          </p>
        ) : (
          <div className="space-y-2">
            {manualBreaks.map((p, i) => <BreakItem key={p.id || i} p={p} />)}
          </div>
        )}
      </div>

      {/* ── Section 2: Screen-Off Breaks ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Screen-Off Breaks</span>
            <span className="text-[10px] text-gray-400">({screenBreaks.length})</span>
          </div>
          {screenMins > 0 && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{fmtDuration(screenMins)}</span>
          )}
        </div>

        {screenBreaks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 dark:bg-dark-700 rounded-xl border border-dashed border-gray-200 dark:border-dark-600">
            No screen-off breaks today
          </p>
        ) : (
          <div className="space-y-2">
            {screenBreaks.map((p, i) => <BreakItem key={p.id || i} p={p} />)}
          </div>
        )}
      </div>

      {/* ── Total summary ── */}
      {totalMins > 0 && (
        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { label: 'Manual',    val: fmtDuration(manualMins), color: 'text-primary-500' },
            { label: 'Screen Off',val: fmtDuration(screenMins), color: 'text-slate-500 dark:text-slate-400' },
            { label: 'Total',     val: fmtDuration(totalMins),  color: 'text-gray-800 dark:text-white' },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center gap-0.5 py-2 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
              <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
              <span className="text-[10px] text-gray-400">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Live Work Timer ───────────────────────────────────────────────────────────
// Ticks every second. Working hours = elapsed since check_in minus ALL pause time.
// Screen-off pauses (reason=screen_lock) shown separately in red.
// While an active pause is open, the working timer is FROZEN — only screen/break timer ticks.
const LiveWorkTimer = () => {
  const [record,       setRecord]       = useState(null)  // today's attendance
  const [pauses,       setPauses]       = useState([])    // today's pauses
  const [tick,         setTick]         = useState(0)     // increments every second
  const [lastFetch,    setLastFetch]    = useState(null)
  const tickRef = useRef(null)

  // ── Fetch today's attendance + pauses ──────────────────────────────────────
  const fetchToday = useCallback(async () => {
    try {
      const [attRes, pauseRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/pauses'),
      ])
      if (attRes.success) setRecord(attRes.data?.check_in ? attRes.data : null)
      if (pauseRes.success) setPauses(pauseRes.data || [])
      setLastFetch(Date.now())
    } catch { /* silent */ }
  }, [])

  // Poll every 30s for fresh data
  useEffect(() => {
    fetchToday()
    const poll = setInterval(fetchToday, 30_000)
    return () => clearInterval(poll)
  }, [fetchToday])

  // Tick every second for live display
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  // ── Derive live values from record + pauses ────────────────────────────────
  if (!record?.check_in) return null   // not checked in today — hide widget

  const checkInMs   = new Date(record.check_in).getTime()
  const checkOutMs  = record.check_out ? new Date(record.check_out).getTime() : Date.now()
  const totalElapsedSec = Math.max(0, Math.floor((checkOutMs - checkInMs) / 1000))

  // Sum all completed pauses
  let completedPauseSec = 0
  let screenOffCompletedSec = 0
  let manualBreakCompletedSec = 0
  pauses.forEach(p => {
    if (p.pause_end) {
      const d = Math.max(0, Math.floor((new Date(p.pause_end) - new Date(p.pause_start)) / 1000))
      completedPauseSec += d
      if (p.reason === 'screen_lock') screenOffCompletedSec += d
      else manualBreakCompletedSec += d
    }
  })

  // Active (open) pause — timer frozen here, its own timer ticks
  const activePause = pauses.find(p => !p.pause_end)
  let activePauseSec = 0
  if (activePause) {
    activePauseSec = Math.max(0, Math.floor((Date.now() - new Date(activePause.pause_start).getTime()) / 1000))
  }

  const totalPauseSec     = completedPauseSec + activePauseSec
  const workingSec        = Math.max(0, totalElapsedSec - totalPauseSec)
  const screenOffTotalSec = screenOffCompletedSec + (activePause?.reason === 'screen_lock' ? activePauseSec : 0)
  const manualBreakSec    = manualBreakCompletedSec + (activePause && activePause.reason !== 'screen_lock' ? activePauseSec : 0)
  const isCheckedOut      = !!record.check_out
  const isScreenOff       = activePause?.reason === 'screen_lock'
  const isOnManualBreak   = activePause && activePause.reason !== 'screen_lock'

  const fmtSec = (s) => {
    if (s < 0) s = 0
    const h  = Math.floor(s / 3600)
    const m  = Math.floor((s % 3600) / 60)
    const sc = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`
  }

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-4 sm:p-5 ${
        isScreenOff
          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
          : isOnManualBreak
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'
          : isCheckedOut
          ? 'bg-gray-50 dark:bg-dark-800 border-gray-100 dark:border-dark-600'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isScreenOff ? (
            <MonitorOff size={16} className="text-slate-500 dark:text-slate-400" />
          ) : isOnManualBreak ? (
            <PauseCircle size={16} className="text-orange-500" />
          ) : isCheckedOut ? (
            <Clock size={16} className="text-gray-400" />
          ) : (
            <Monitor size={16} className="text-green-500" />
          )}
          <span className={`text-sm font-semibold ${
            isScreenOff      ? 'text-slate-600 dark:text-slate-300' :
            isOnManualBreak  ? 'text-orange-600 dark:text-orange-400' :
            isCheckedOut     ? 'text-gray-500 dark:text-gray-400' :
                               'text-green-700 dark:text-green-400'
          }`}>
            {isScreenOff     ? '🔒 Screen Off — Timer Paused' :
             isOnManualBreak ? `⏸ On Break — ${PAUSE_REASON_MAP[activePause.reason]?.label || 'Break'}` :
             isCheckedOut    ? '✅ Work Day Completed' :
                               '🟢 Live Working Hours'}
          </span>
        </div>
        <span className="text-[10px] text-gray-400">
          Updated {lastFetch ? new Date(lastFetch).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
        </span>
      </div>

      {/* Main timer grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">

        {/* Working Hours — FROZEN when screen-off or on break */}
        <div className={`flex flex-col items-center py-3 px-2 rounded-xl border ${
          isScreenOff || isOnManualBreak
            ? 'bg-gray-100 dark:bg-dark-700 border-gray-200 dark:border-dark-600'
            : 'bg-green-500/10 border-green-500/20'
        }`}>
          <span className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${
            isScreenOff || isOnManualBreak ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'
          }`}>
            {fmtSec(workingSec)}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-medium">Working Time</span>
          {(isScreenOff || isOnManualBreak) && (
            <span className="text-[9px] text-gray-400 mt-0.5">⏸ Paused</span>
          )}
        </div>

        {/* Screen-Off time */}
        <div className={`flex flex-col items-center py-3 px-2 rounded-xl border ${
          isScreenOff
            ? 'bg-slate-500/15 border-slate-400/30'
            : 'bg-slate-50 dark:bg-dark-700 border-slate-100 dark:border-dark-600'
        }`}>
          <span className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${
            isScreenOff ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {fmtSec(screenOffTotalSec)}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-medium">Screen Off</span>
          {isScreenOff && (
            <span className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 animate-pulse">● Counting</span>
          )}
        </div>

        {/* Manual break time */}
        <div className={`flex flex-col items-center py-3 px-2 rounded-xl border ${
          isOnManualBreak
            ? 'bg-orange-500/15 border-orange-400/30'
            : 'bg-orange-50 dark:bg-dark-700 border-orange-100 dark:border-dark-600'
        }`}>
          <span className={`text-xl sm:text-2xl font-mono font-bold tabular-nums ${
            isOnManualBreak ? 'text-orange-600 dark:text-orange-400' : 'text-orange-400 dark:text-orange-500'
          }`}>
            {fmtSec(manualBreakSec)}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-medium">Break Time</span>
          {isOnManualBreak && (
            <span className="text-[9px] text-orange-500 mt-0.5 animate-pulse">● Counting</span>
          )}
        </div>

        {/* Total elapsed */}
        <div className="flex flex-col items-center py-3 px-2 rounded-xl border bg-primary-500/5 border-primary-500/15">
          <span className="text-xl sm:text-2xl font-mono font-bold tabular-nums text-primary-600 dark:text-primary-400">
            {fmtSec(totalElapsedSec)}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 font-medium">Total Elapsed</span>
        </div>
      </div>

      {/* Check-in / Check-out time row */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Login: <strong className="text-green-600 dark:text-green-400 font-mono">{fmtTime(record.check_in)}</strong>
        </span>
        {record.check_out ? (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            Logout: <strong className="text-red-500 font-mono">{fmtTime(record.check_out)}</strong>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="text-green-600 dark:text-green-400 font-medium">Still working</span>
          </span>
        )}
        {activePause && (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
            {isScreenOff ? 'Screen locked' : 'Break started'}: <strong className="text-yellow-600 dark:text-yellow-400 font-mono">{fmtPauseTime(activePause.pause_start)}</strong>
          </span>
        )}
      </div>

      {/* Info note */}
      <p className="text-[10px] text-gray-400 mt-3">
        💡 Working Time = Total Elapsed − Screen Off − Manual Breaks. Timer updates every second.
      </p>
    </motion.div>
  )
}

// ── My Session Panel (Employee view — NO screen-off) ──────────────────────────
// Shows login/logout sessions + working hours when employee clicks a date row
const MySessionPanel = ({ date, onClose }) => {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get(`/attendance/my-sessions?date=${date}`)
      if (res.success) setSessions(res.data || [])
    } catch {}
    setLoading(false)
  }, [date])

  useEffect(() => {
    setLoading(true)
    loadSessions()
    // Auto-refresh every 30s for today
    const todayStr = new Date().toISOString().split('T')[0]
    if (date === todayStr) {
      const iv = setInterval(loadSessions, 30000)
      return () => clearInterval(iv)
    }
  }, [loadSessions, date])

  const fmtTime = ts => ts
    ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  const fmtDur = (mins) => {
    if (!mins && mins !== 0) return '—'
    const totalSecs = Math.round(Number(mins) * 60)
    if (totalSecs <= 0) return '—'
    if (totalSecs < 60) return `${totalSecs}s`
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
    const h = Math.floor(m / 60); const rm = m % 60
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mx-2 sm:mx-4 mb-3 p-4 rounded-2xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Clock size={14} className="text-primary-500" />
            Session Log — {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <button onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-400">
            <X size={13} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No sessions recorded for this day</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s, i) => {
              const isActive = !s.logout_at
              const manualM  = Number(s.manual_break_mins) || 0
              const workMins = Number(s.duration_mins) || 0
              return (
                <div key={s.id}
                  className={`p-3 rounded-xl border ${
                    isActive
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-white dark:bg-dark-800 border-gray-100 dark:border-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Session {i + 1}</span>
                    {isActive && (
                      <span className="text-[10px] font-semibold text-green-500 animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-1.5">
                      <LogIn size={12} className="text-green-500" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Login</span>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono">{fmtTime(s.login_at)}</span>
                    </div>
                    <span className="text-gray-300 dark:text-dark-500 text-xs">→</span>
                    <div className="flex items-center gap-1.5">
                      <LogOut size={12} className="text-red-400" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Logout</span>
                      <span className={`text-xs font-bold font-mono ${isActive ? 'text-green-500 animate-pulse' : 'text-red-500'}`}>
                        {isActive ? 'Still active' : fmtTime(s.logout_at)}
                      </span>
                    </div>
                    {workMins > 0 && (
                      <span className="ml-auto text-xs font-semibold text-primary-500 flex-shrink-0">
                        {fmtDur(workMins)} work
                      </span>
                    )}
                  </div>
                  {manualM > 0 && (
                    <div className="flex items-center gap-2 mt-1 pt-2 border-t border-gray-100 dark:border-dark-600">
                      <PauseCircle size={11} className="text-orange-500" />
                      <span className="text-[11px] text-orange-500 font-medium">Break: {fmtDur(manualM)}</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Day total */}
            {(() => {
              const totalWork   = sessions.reduce((s, x) => s + (Number(x.duration_mins)     || 0), 0)
              const totalManual = sessions.reduce((s, x) => s + (Number(x.manual_break_mins) || 0), 0)
              const otHrs       = Math.max(0, (totalWork / 60) - 9)
              return (
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { label: 'Total Work',  val: fmtDur(totalWork),   color: 'text-primary-600 dark:text-primary-400' },
                    { label: 'Breaks',      val: fmtDur(totalManual), color: 'text-orange-500' },
                    { label: 'OT',          val: otHrs > 0 ? fmtDur(otHrs * 60) : '—', color: 'text-blue-500' },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col items-center py-2 rounded-xl bg-gray-100 dark:bg-dark-600">
                      <span className={`text-xs font-bold ${s.color}`}>{s.val}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{s.label}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
            <p className="text-[10px] text-gray-400 text-center">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} · Screen-off details available to admin
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Attendance Calendar ────────────────────────────────────────────────────────
const AttendanceCalendar = ({ month, year, attendanceData = [] }) => {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const statusForDate = (d) => {
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    // Support both API format (snake_case) and legacy camelCase
    return attendanceData.find(a => (a.date || '').startsWith(key))?.status ?? null
  }
  const today = new Date()
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <p key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const status  = d ? statusForDate(d) : null
          const isToday = d && today.getDate()===d && today.getMonth()===month && today.getFullYear()===year
          return (
            <div key={i} className={`aspect-square flex items-center justify-center text-xs rounded-lg font-medium ${
              !d ? '' :
              isToday ? 'ring-2 ring-primary-500 font-bold ' + (status ? statusColors[status] : 'bg-primary-500/15 text-primary-600 dark:text-primary-400')
              : status ? statusColors[status]
              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}>{d ?? ''}</div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        {[['present','bg-green-500'],['leave','bg-yellow-400'],['late','bg-orange-400'],['absent','bg-red-500']].map(([s,c]) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${c}`} />{capitalize(s)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Request Leave Modal ────────────────────────────────────────────────────────
const RequestLeaveModal = ({ onClose, onSuccess }) => {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm]       = useState({ leave_type: 'casual', start_date: today, end_date: today, reason: '' })
  const [saving, setSaving]   = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const days = Math.max(1,
    Math.round((new Date(form.end_date) - new Date(form.start_date)) / (1000*60*60*24)) + 1
  )

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) { toast.error('Please select dates'); return }
    if (!form.reason.trim()) { toast.error('Please provide a reason'); return }
    setSaving(true)
    try {
      const res = await api.post('/leaves', form)
      if (res.success) {
        toast.success('Leave request submitted! HR will review it.')
        onSuccess()
        onClose()
      } else {
        toast.error(res.message || 'Failed to submit leave request')
      }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Request Leave</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Leave type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Leave Type *</label>
            <select
              value={form.leave_type}
              onChange={e => setF('leave_type', e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {LEAVE_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Leave</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From *</label>
              <input type="date" value={form.start_date}
                onChange={e => setF('start_date', e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To *</label>
              <input type="date" value={form.end_date} min={form.start_date}
                onChange={e => setF('end_date', e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Days count */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <Calendar size={14} className="text-primary-500" />
            <span className="text-sm text-primary-700 dark:text-primary-400 font-medium">
              {days} day{days > 1 ? 's' : ''} of {form.leave_type} leave
            </span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reason *</label>
            <textarea
              value={form.reason}
              onChange={e => setF('reason', e.target.value)}
              placeholder="Please provide a reason for your leave..."
              rows={3}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              Leave requests require HR approval. You will be notified once reviewed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose}
            className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Submitting…</>
              : <><Plus size={15} /> Submit Request</>
            }
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const EmployeeAttendance = () => {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear())
  const [activeTab,     setActiveTab]     = useState('history')
  const [attendance,    setAttendance]    = useState([])
  const [summary,       setSummary]       = useState(null)
  const [weeklyData,    setWeeklyData]    = useState([])
  const [holidays,      setHolidays]      = useState([])
  const [leaves,        setLeaves]        = useState([])
  const [showLeaveModal,setShowLeaveModal]= useState(false)
  const [cancelling,    setCancelling]    = useState(null)
  const [loading,       setLoading]       = useState(true)
  // Pause history — which attendance row is expanded
  const [breakRecord,   setBreakRecord]   = useState(null)
  // Session panel — which date is expanded (employee clicks date row)
  const [sessionDate,   setSessionDate]   = useState(null)
  // Tick every second so today's live hours updates in the table
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const loadAttendance = async (year, month) => {
    try {
      const from = `${year}-${String(month+1).padStart(2,'0')}-01`
      const last = new Date(year, month+1, 0).getDate()
      const to   = `${year}-${String(month+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`
      const data = await attendanceService.getMy({ from, to, limit: 100 })
      const rows = Array.isArray(data) ? data : []
      setAttendance(rows)
    } catch {}
  }

  const loadLeaves = async () => {
    try {
      const res = await api.get('/leaves/my')
      if (res.success) setLeaves(res.data)
    } catch {}
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        // Stats — always current month
        attendanceService.getSummary({ year: now.getFullYear(), month: now.getMonth()+1 })
          .then(d => { if (d) setSummary(d) }),
        // Weekly chart — current month
        attendanceService.getWeekly(now.getFullYear(), now.getMonth()+1)
          .then(d => { if (d?.length) setWeeklyData(d) }),
        // Holidays
        api.get('/attendance/holidays').then(res => {
          if (res.success && res.data?.length) setHolidays(res.data)
        }),
        // Leaves
        loadLeaves(),
        // Calendar for current month
        loadAttendance(now.getFullYear(), now.getMonth()),
      ])
      setLoading(false)
    }
    init()
  }, [])

  // Reload attendance when month/year changes
  useEffect(() => {
    loadAttendance(selectedYear, selectedMonth)
  }, [selectedMonth, selectedYear])

  // Auto-reload current month every 30s to refresh today's hours_worked + check_out
  useEffect(() => {
    const iv = setInterval(() => {
      loadAttendance(now.getFullYear(), now.getMonth())
    }, 30000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCancelLeave = async (id) => {
    setCancelling(id)
    try {
      const res = await api.delete(`/leaves/${id}`)
      if (res.success) {
        toast.success('Leave request cancelled')
        loadLeaves()
      } else {
        toast.error(res.message || 'Cannot cancel this request')
      }
    } catch { toast.error('Cannot connect to server') }
    setCancelling(null)
  }

  // Real column definitions — using DB field names
  const attendanceColumns = [
    { key: 'date',         label: 'Date',      sortable: true, render: v => formatDate(v) },
    { key: 'check_in',     label: 'Check In',  render: v => v ? new Date(v).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—' },
    { key: 'check_out',    label: 'Check Out', render: v => v ? new Date(v).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—' },
    { key: 'hours_worked', label: 'Hours',     render: v => v ? `${v}h` : '—' },
    { key: 'work_mode',    label: 'Mode',      render: v => v ? <Badge label={v} color="bg-primary-500/10 text-primary-500" /> : '—' },
    { key: 'status',       label: 'Status',    render: v => v ? <Badge label={v} color={getStatusColor(v)} dot /> : '—' },
    { key: 'is_late',      label: 'Late',      render: v => v ? <span className="text-orange-500 text-xs font-semibold">Yes</span> : <span className="text-green-500 text-xs">No</span> },
    { key: 'overtime',     label: 'OT (h)',    render: v => v > 0 ? <span className="text-blue-500 text-xs font-semibold">+{v}h</span> : '—' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your attendance and leave records</p>
        </div>
        <button
          onClick={() => setShowLeaveModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 transition-all shadow-md shadow-primary-500/25 whitespace-nowrap"
        >
          <Plus size={15} /> Request Leave
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Attendance Rate" value={summary ? `${summary.attendance_percent ?? summary.attendancePercent ?? 0}%` : '—'} subtitle="This month" icon={TrendingUp} color="green"  delay={0.1} />
        <StatCard title="Days Present"    value={summary?.present ?? '—'}  subtitle="This month" icon={Clock}     color="blue"   delay={0.2} />
        <StatCard title="Late Logins"     value={summary?.late    ?? '—'}  subtitle="This month" icon={Clock}     color="yellow" delay={0.3} />
        <StatCard title="Leave Taken"     value={leaves.filter(l => l.status === 'approved').length} subtitle="Approved" icon={Calendar} color="purple" delay={0.4} />
      </motion.div>

      {/* Calendar + Chart */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="lg:col-span-3 overflow-hidden" delay={0.3}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Attendance Calendar</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedMonth(m => Math.max(0, m - 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 w-24 sm:w-36 text-center">
                  {MONTHS[selectedMonth]} {selectedYear}
                </span>
                <button onClick={() => setSelectedMonth(m => Math.min(11, m + 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <AnimatePresence mode="wait">
              <motion.div key={selectedMonth} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration: 0.2 }}>
                <AttendanceCalendar month={selectedMonth} year={selectedYear} attendanceData={attendance} />
              </motion.div>
            </AnimatePresence>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden" delay={0.35}>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Weekly Breakdown</h3>
          </CardHeader>
          <CardBody className="pt-2 px-2 sm:px-4">
            {weeklyData.length > 0
              ? <AttendanceBarChart data={weeklyData} />
              : <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                  No attendance data for this month
                </div>
            }
          </CardBody>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto scrollbar-hide">
        {[
          { key: 'history',  label: 'History' },
          { key: 'leaves',   label: `Leaves${leaves.length ? ` (${leaves.length})` : ''}` },
          { key: 'breaks',   label: 'Breaks' },
          { key: 'holidays', label: 'Holidays' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >{tab.label}</button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration: 0.2 }}>

          {/* History tab */}
          {activeTab === 'history' && (
            <Card>
              <CardBody className="p-0 sm:p-4">
                {attendance.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock size={32} className="mx-auto text-gray-300 dark:text-dark-500 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No attendance records</p>
                    <p className="text-sm text-gray-400 mt-1">Records will appear after you Check In</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-dark-700">
                          {['Date','Check-In','Check-Out','Hours','Mode','Status','OT Hours'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                        {attendance.map((r, i) => {
                          const dateKey  = typeof r.date === 'string' ? r.date.split('T')[0] : r.date
                          const isToday  = dateKey === new Date().toISOString().split('T')[0]
                          const isExpanded = sessionDate === dateKey
                          const isActive = r.check_in && !r.check_out  // currently logged in

                          // Live hours: tick-based for today's active session
                          const liveHoursStr = (() => {
                            if (!r.check_in) return '—'
                            // Past day with stored value — just show it
                            if (!isToday && r.hours_worked) return `${r.hours_worked}h`
                            // Completed today — show stored
                            if (r.check_out && r.hours_worked) return `${r.hours_worked}h`
                            // Live — calc from check_in to now minus pauses
                            const endMs      = r.check_out ? new Date(r.check_out).getTime() : Date.now()
                            const elapsedSec = Math.max(0, Math.floor((endMs - new Date(r.check_in).getTime()) / 1000))
                            const pauseSec   = Math.round((r.total_pause_mins || 0) * 60)
                            const workSec    = Math.max(0, elapsedSec - pauseSec)
                            const h = Math.floor(workSec / 3600)
                            const m = Math.floor((workSec % 3600) / 60)
                            const s = workSec % 60
                            if (isActive) return `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`
                            return `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2,'0')}m`
                          })()

                          return (
                            <React.Fragment key={i}>
                            <tr
                              onClick={() => setSessionDate(isExpanded ? null : dateKey)}
                              className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors cursor-pointer select-none">
                              {/* Date */}
                              <td className="px-3 py-2.5 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  {formatDate(r.date)}
                                  <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.15 }}
                                    className="text-gray-400 text-xs">›</motion.span>
                                </span>
                              </td>
                              {/* Check-In */}
                              <td className="px-3 py-2.5 text-green-600 dark:text-green-400 font-medium whitespace-nowrap font-mono">
                                {r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                              </td>
                              {/* Check-Out */}
                              <td className="px-3 py-2.5 font-medium whitespace-nowrap font-mono">
                                {r.check_out
                                  ? <span className="text-red-500">{new Date(r.check_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                                  : r.check_in
                                  ? <span className="text-xs text-green-500 animate-pulse">In office</span>
                                  : '—'}
                              </td>
                              {/* Hours — live for active, stored for past */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`font-mono font-semibold flex items-center gap-1 ${
                                  isActive && isToday ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {isActive && isToday && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                                  )}
                                  {liveHoursStr}
                                </span>
                              </td>
                              {/* Mode */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.work_mode
                                  ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 capitalize">{r.work_mode}</span>
                                  : '—'}
                              </td>
                              {/* Status */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.status ? <Badge label={r.status} color={getStatusColor(r.status)} dot /> : '—'}
                              </td>
                              {/* OT Hours */}
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {r.overtime > 0
                                  ? <span className="text-blue-500 text-xs font-semibold">+{r.overtime}h</span>
                                  : '—'}
                              </td>
                            </tr>
                            {/* Session expand row */}
                            {isExpanded && (
                              <tr key={`session-${dateKey}`}>
                                <td colSpan={7} className="p-0">
                                  <AnimatePresence>
                                    <MySessionPanel
                                      date={dateKey}
                                      onClose={() => setSessionDate(null)}
                                    />
                                  </AnimatePresence>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Inline break detail panel */}
                <AnimatePresence>
                  {breakRecord && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      className="border-t border-gray-100 dark:border-dark-600 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                          <PauseCircle size={15} className="text-yellow-500" />
                          Break History — {formatDate(breakRecord.date)}
                        </p>
                        <button onClick={() => setBreakRecord(null)}
                          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
                          <X size={13} />
                        </button>
                      </div>
                      <PauseHistoryPanel attendanceId={breakRecord.id} date={breakRecord.date} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardBody>
            </Card>
          )}

          {/* Leaves tab */}
          {activeTab === 'leaves' && (
            <div className="space-y-3">
              {leaves.length === 0 ? (
                <Card>
                  <CardBody className="py-12 text-center">
                    <Calendar size={32} className="mx-auto text-gray-300 dark:text-dark-500 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No leave requests yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Request Leave" to submit one</p>
                  </CardBody>
                </Card>
              ) : (
                leaves.map(leave => (
                  <div key={leave.id} className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                            {leave.leave_type} Leave
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${leaveStatusColor(leave.status)}`}>
                            {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(leave.start_date)} → {formatDate(leave.end_date)} &nbsp;·&nbsp; {leave.days} day{leave.days > 1 ? 's' : ''}
                        </p>
                        {leave.reason && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{leave.reason}</p>
                        )}
                        {leave.reviewer_note && (
                          <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-gray-50 dark:bg-dark-700">
                            {leave.status === 'approved'
                              ? <CheckCircle size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
                              : <AlertCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                            }
                            <p className="text-xs text-gray-600 dark:text-gray-300">{leave.reviewer_note}</p>
                          </div>
                        )}
                      </div>
                      {leave.status === 'pending' && (
                        <button
                          onClick={() => handleCancelLeave(leave.id)}
                          disabled={cancelling === leave.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {cancelling === leave.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Breaks tab */}
          {activeTab === 'breaks' && (
            <div className="space-y-4">
              {/* Today's breaks quick panel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <PauseCircle size={16} className="text-yellow-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Today's Breaks</h3>
                  </div>
                </CardHeader>
                <CardBody>
                  <TodayBreaksPanel />
                </CardBody>
              </Card>

              {/* Past days with breaks */}
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Break History</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Days with recorded breaks — click to expand</p>
                </CardHeader>
                <CardBody className="space-y-2">
                  {attendance.filter(r => r.total_pause_mins > 0).length === 0 ? (
                    <div className="py-10 text-center">
                      <PauseCircle size={28} className="mx-auto text-gray-300 dark:text-dark-500 mb-2" />
                      <p className="text-sm text-gray-400">No breaks recorded this month</p>
                    </div>
                  ) : (
                    attendance.filter(r => r.total_pause_mins > 0).map(r => (
                      <div key={r.id}>
                        <button
                          onClick={() => setBreakRecord(breakRecord?.id === r.id ? null : r)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                            bg-gray-50 dark:bg-dark-700 hover:bg-gray-100 dark:hover:bg-dark-600
                            border border-gray-100 dark:border-dark-600 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                              <PauseCircle size={15} className="text-yellow-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatDate(r.date)}</p>
                              <p className="text-xs text-gray-400">
                                {r.hours_worked ? `${r.hours_worked}h worked` : 'No checkout'} · {Math.round(r.total_pause_mins)}m break
                              </p>
                            </div>
                          </div>
                          <motion.div animate={{ rotate: breakRecord?.id === r.id ? 180 : 0 }}>
                            <ChevronRight size={15} className="text-gray-400" />
                          </motion.div>
                        </button>
                        <AnimatePresence>
                          {breakRecord?.id === r.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                              className="px-4 pb-2 pt-1 border border-t-0 border-gray-100 dark:border-dark-600 rounded-b-xl"
                            >
                              <PauseHistoryPanel attendanceId={r.id} date={r.date} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* Holidays tab */}
          {activeTab === 'holidays' && (
            <Card>
              <CardBody className="space-y-3">
                {holidays.map((h, i) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                        <Calendar size={16} className="text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{h.name}</p>
                        <p className="text-xs text-gray-400">{formatDate(h.date)}</p>
                      </div>
                    </div>
                    <Badge label={h.type} color={h.type === 'national' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'} />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Request Leave Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <RequestLeaveModal
            onClose={() => setShowLeaveModal(false)}
            onSuccess={loadLeaves}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default EmployeeAttendance
