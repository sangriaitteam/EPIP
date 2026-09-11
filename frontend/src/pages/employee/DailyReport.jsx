import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, CheckCircle2, AlertTriangle, Lightbulb,
  Send, Edit3, ChevronDown, Plus, Calendar, X
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import ProgressBar from '../../components/common/ProgressBar'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp    = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 15 } } }

// ── Constants ─────────────────────────────────────────────────────────────────
const MOODS = [
  { value: 'great',   label: 'Great',   emoji: '😄', color: 'border-green-400  bg-green-500/10  text-green-600  dark:text-green-400' },
  { value: 'good',    label: 'Good',    emoji: '🙂', color: 'border-blue-400   bg-blue-500/10   text-blue-600   dark:text-blue-400' },
  { value: 'neutral', label: 'Okay',    emoji: '😐', color: 'border-yellow-400 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
  { value: 'tough',   label: 'Tough',   emoji: '😕', color: 'border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { value: 'bad',     label: 'Bad',     emoji: '😞', color: 'border-red-400    bg-red-500/10    text-red-600    dark:text-red-400' },
]

const EMPTY_FORM = { work_summary: '', achievements: '', blockers: '', plan_tomorrow: '', mood: 'good' }

const textareaCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none`

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  const ds = date.toISOString().split('T')[0]
  if (ds === today.toISOString().split('T')[0])     return 'Today'
  if (ds === yesterday.toISOString().split('T')[0]) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Single report card (expanded) ─────────────────────────────────────────────
const ReportCard = ({ report, isToday, onEdit }) => {
  const mood = MOODS.find(m => m.value === report.mood) || MOODS[1]
  return (
    <motion.div variants={fadeUp}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-xl">
            {mood.emoji}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {fmtDate(report.report_date)}
              {isToday && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-500/15 text-primary-600 dark:text-primary-400">
                  TODAY
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${mood.color}`}>
                {mood.label} day
              </span>
              <span className="text-xs text-gray-400">
                {new Date(report.report_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        {isToday && onEdit && (
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
              border border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400
              hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            <Edit3 size={12} /> Edit
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {[
          { icon: FileText,      label: 'Work Done',          value: report.work_summary,  color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-dark-700' },
          { icon: CheckCircle2,  label: 'Achievements / Wins',value: report.achievements,   color: 'text-green-500',  bg: 'bg-green-500/5 dark:bg-green-500/10' },
          { icon: AlertTriangle, label: 'Blockers / Issues',  value: report.blockers,       color: 'text-red-500',    bg: 'bg-red-500/5 dark:bg-red-500/10' },
          { icon: Lightbulb,     label: 'Plan for Tomorrow',  value: report.plan_tomorrow,  color: 'text-blue-500',   bg: 'bg-blue-500/5 dark:bg-blue-500/10' },
        ].filter(s => s.value).map(s => (
          <div key={s.label} className={`p-3 rounded-xl ${s.bg}`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${s.color}`}>
              <s.icon size={12} /> {s.label}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Report Form ───────────────────────────────────────────────────────────────
const ReportForm = ({ initial = EMPTY_FORM, isEdit, onSubmitted, onCancel }) => {
  const [form,       setForm]       = useState(initial)
  const [submitting, setSubmitting] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.work_summary.trim()) { toast.error('Work summary is required'); return }
    setSubmitting(true)
    try {
      const res = await api.post('/daily-reports', form)
      if (res.success) {
        toast.success(isEdit ? '✅ Report updated!' : '📋 Daily report submitted!')
        onSubmitted(res.data)
      } else { toast.error(res.message || 'Submit failed') }
    } catch { toast.error('Cannot connect to server') }
    setSubmitting(false)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
      {/* Form header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <FileText size={17} className="text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {isEdit ? 'Edit Today\'s Report' : 'New Daily Report'}
            </p>
            <p className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        {isEdit && onCancel && (
          <button onClick={onCancel}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Mood */}
        <div>
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2.5">
            How was your day?
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => (
              <button key={m.value} onClick={() => setF('mood', m.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  form.mood === m.value ? m.color + ' scale-105' : 'border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400'
                }`}>
                <span className="text-base">{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Work summary */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
            <FileText size={12} className="text-gray-400" />
            What did you work on today? <span className="text-red-400 normal-case font-normal">(required)</span>
          </label>
          <textarea value={form.work_summary} onChange={e => setF('work_summary', e.target.value)}
            rows={4} placeholder="Describe your tasks, meetings, and what you accomplished…"
            className={textareaCls} />
        </div>

        {/* Achievements */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
            <CheckCircle2 size={12} /> Achievements / Wins
            <span className="text-gray-400 normal-case font-normal">(optional)</span>
          </label>
          <textarea value={form.achievements} onChange={e => setF('achievements', e.target.value)}
            rows={2} placeholder="Any completions, milestones, wins, positive feedback…"
            className={textareaCls} />
        </div>

        {/* Blockers */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-wide mb-2">
            <AlertTriangle size={12} /> Blockers / Issues
            <span className="text-gray-400 normal-case font-normal">(optional)</span>
          </label>
          <textarea value={form.blockers} onChange={e => setF('blockers', e.target.value)}
            rows={2} placeholder="Dependencies, blockers, or issues that slowed you down…"
            className={textareaCls} />
        </div>

        {/* Plan tomorrow */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">
            <Lightbulb size={12} /> Plan for Tomorrow
            <span className="text-gray-400 normal-case font-normal">(optional)</span>
          </label>
          <textarea value={form.plan_tomorrow} onChange={e => setF('plan_tomorrow', e.target.value)}
            rows={2} placeholder="What's on your agenda for tomorrow…"
            className={textareaCls} />
        </div>

        {/* Submit */}
        <div className={`flex gap-3 ${isEdit ? '' : ''}`}>
          {isEdit && onCancel && (
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600
                text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
              Cancel
            </button>
          )}
          <motion.button onClick={handleSubmit} disabled={submitting}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600
              disabled:opacity-60 transition-colors shadow-lg shadow-primary-500/25">
            {submitting
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <><Send size={15} /> {isEdit ? 'Update Report' : 'Submit Daily Report'}</>
            }
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeDailyReport = () => {
  const [todayReport, setTodayReport] = useState(null)
  const [pastReports, setPastReports] = useState([])
  const [editing,     setEditing]     = useState(false)
  const [loading,     setLoading]     = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const load = async () => {
    setLoading(true)
    try {
      const [todayRes, pastRes] = await Promise.all([
        api.get('/daily-reports/today'),
        api.get('/daily-reports/my?limit=14'),
      ])
      if (todayRes.success && todayRes.data) setTodayReport(todayRes.data)
      if (pastRes.success) {
        setPastReports((pastRes.data || []).filter(r => r.report_date?.split('T')[0] !== today))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmitted = (report) => {
    setTodayReport(report)
    setEditing(false)
    // Refresh past list too
    api.get('/daily-reports/my?limit=14').then(res => {
      if (res.success) setPastReports((res.data || []).filter(r => r.report_date?.split('T')[0] !== today))
    }).catch(() => {})
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Daily Report</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {/* Only show "New Report" button if today's already submitted and not editing */}
        {todayReport && !editing && (
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
              bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
              <CheckCircle2 size={13} /> Today's report submitted
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Today's section */}
      <motion.div variants={fadeUp}>
        <AnimatePresence mode="wait">
          {/* Show submitted report */}
          {todayReport && !editing && (
            <motion.div key="submitted"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReportCard report={todayReport} isToday onEdit={() => setEditing(true)} />
            </motion.div>
          )}

          {/* Show form — new or edit */}
          {(!todayReport || editing) && (
            <motion.div key="form"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReportForm
                initial={editing && todayReport ? {
                  work_summary:  todayReport.work_summary  || '',
                  achievements:  todayReport.achievements  || '',
                  blockers:      todayReport.blockers       || '',
                  plan_tomorrow: todayReport.plan_tomorrow  || '',
                  mood:          todayReport.mood           || 'good',
                } : EMPTY_FORM}
                isEdit={editing}
                onSubmitted={handleSubmitted}
                onCancel={editing ? () => setEditing(false) : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Past reports */}
      {pastReports.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Previous Reports
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 font-medium">
              {pastReports.length}
            </span>
          </div>
          <motion.div variants={container} className="space-y-3">
            {pastReports.map(r => (
              <ReportCard key={r.id} report={r} isToday={false} />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Empty state — no reports at all */}
      {!todayReport && pastReports.length === 0 && (
        <motion.div variants={fadeUp}
          className="flex flex-col items-center justify-center py-20 text-center
            rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <FileText size={26} className="text-primary-500" />
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No reports yet</h3>
          <p className="text-sm text-gray-400">Submit your first daily report above</p>
        </motion.div>
      )}

    </motion.div>
  )
}

export default EmployeeDailyReport
