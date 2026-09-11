import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Target, Upload, CheckCircle, Clock,
  AlertCircle, X, Loader2, Edit2, Trash2
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import StatCard from '../../components/common/StatCard'
import { goalService } from '../../services/goalService'
import { formatDate, capitalize } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────
const typeColors = {
  monthly:   'bg-blue-500/10 text-blue-500',
  quarterly: 'bg-purple-500/10 text-purple-500',
  annual:    'bg-orange-500/10 text-orange-500',
}
const approvalColors = {
  approved: 'bg-green-500/10 text-green-500',
  pending:  'bg-yellow-500/10 text-yellow-500',
  rejected: 'bg-red-500/10 text-red-500',
}
const statusColors = {
  not_started: 'bg-gray-500/10 text-gray-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed:   'bg-green-500/10 text-green-500',
  cancelled:   'bg-red-500/10 text-red-500',
}

const inputCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

const PERIOD_OPTIONS = ['Q1-2026','Q2-2026','Q3-2026','Q4-2026','H1-2026','H2-2026','FY-2026']

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

// ── Helper: safe field access (API = snake_case, legacy mock = camelCase) ─────
const gVal = (goal, snake, camel) => goal[snake] ?? goal[camel]

// ── Add / Edit Goal Modal ─────────────────────────────────────────────────────
const GoalModal = ({ goal, onClose, onSaved }) => {
  const isEdit = !!goal
  const [form, setForm] = useState({
    title:              goal?.title              || '',
    description:        goal?.description        || '',
    type:               goal?.type               || 'quarterly',
    period:             goal?.period             || 'Q3-2026',
    weightage:          goal?.weightage          || 10,
    kpi_metric:         goal?.kpi_metric         || goal?.kpiMetric || '',
    due_date:           goal?.due_date           || goal?.dueDate   || '',
    completion_percent: goal?.completion_percent ?? goal?.completionPercent ?? 0,
    status:             goal?.status             || 'not_started',
  })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Goal title is required'); return }
    if (form.weightage < 1 || form.weightage > 100) { toast.error('Weightage must be 1–100'); return }
    setSaving(true)
    try {
      const result = isEdit
        ? await goalService.update(goal.id, form)
        : await goalService.create(form)
      if (result) {
        toast.success(isEdit ? 'Goal updated ✅' : 'Goal created ✅')
        onSaved()
        onClose()
      } else { toast.error('Save failed — try again') }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-lg
          rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Target size={16} className="text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {isEdit ? 'Edit Goal' : 'New Goal'}
              </h3>
              <p className="text-xs text-gray-400">Set your KPI target</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Goal Title <span className="text-red-500">*</span>
            </label>
            <input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="e.g. Increase sales by 20%" className={inputCls} autoFocus />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setF('description', e.target.value)}
              rows={2} placeholder="Describe the goal in detail…"
              className={`${inputCls} resize-none`} />
          </div>

          {/* Type + Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Type</label>
              <select value={form.type} onChange={e => setF('type', e.target.value)} className={inputCls}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Period</label>
              <select value={form.period} onChange={e => setF('period', e.target.value)} className={inputCls}>
                {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* KPI Metric + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">KPI Metric</label>
              <input value={form.kpi_metric} onChange={e => setF('kpi_metric', e.target.value)}
                placeholder="e.g. Revenue, Calls" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Weightage + Completion */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Weightage (%) <span className="text-red-500">*</span>
              </label>
              <input type="number" min={1} max={100} value={form.weightage}
                onChange={e => setF('weightage', parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Completion (%)
              </label>
              <input type="number" min={0} max={100} value={form.completion_percent}
                onChange={e => setF('completion_percent', parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {['not_started','in_progress','completed','cancelled'].map(s => (
                <button key={s} type="button" onClick={() => setF('status', s)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.status === s
                      ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400'
                  }`}>
                  {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600
              text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            Cancel
          </button>
          <motion.button onClick={handleSave} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600
              disabled:opacity-60 transition-colors">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={14} /> {isEdit ? 'Update Goal' : 'Create Goal'}</>
            }
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const EmployeeGoals = () => {
  const [activeTab,    setActiveTab]    = useState('goals')
  const [filterType,   setFilterType]   = useState('all')
  const [goals,        setGoals]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editGoal,     setEditGoal]     = useState(null)
  const [deleting,     setDeleting]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await goalService.getMy()
      setGoals(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete goal "${title}"?`)) return
    setDeleting(id)
    try {
      await goalService.delete(id)
      toast.success('Goal deleted')
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch { toast.error('Delete failed') }
    setDeleting(null)
  }

  // ── Stats — computed from real goals state ──────────────────────────────────
  const totalGoals     = goals.length
  const avgCompletion  = totalGoals
    ? Math.round(goals.reduce((s, g) => s + (gVal(g, 'completion_percent', 'completionPercent') ?? 0), 0) / totalGoals)
    : 0
  const approved       = goals.filter(g => gVal(g, 'approval_status', 'approvalStatus') === 'approved').length
  const totalWeightage = goals.reduce((s, g) => s + (g.weightage ?? 0), 0)

  const filtered = filterType === 'all'
    ? goals
    : goals.filter(g => g.type === filterType)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Goals & KPIs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your OKRs and performance indicators</p>
        </div>
        <Button onClick={() => { setEditGoal(null); setShowModal(true) }}>
          <Plus size={16} /> Add Goal
        </Button>
      </motion.div>

      {/* Stats — real data */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Goals"     value={totalGoals   || '—'} subtitle="This quarter" color="primary" delay={0.1} />
        <StatCard title="Avg Completion"  value={totalGoals ? `${avgCompletion}%` : '—'} subtitle="All goals" color="green" delay={0.2} />
        <StatCard title="Approved"        value={approved     || '—'} subtitle="By manager"   color="blue"    delay={0.3} />
        <StatCard title="Total Weightage" value={totalGoals ? `${totalWeightage}%` : '—'} subtitle="Goal weight" color="purple" delay={0.4} />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}
        className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto scrollbar-hide">
        {[{ key: 'goals', label: 'My Goals' }, { key: 'kpi', label: 'KPI Overview' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}>{tab.label}</button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

          {/* ── My Goals Tab ── */}
          {activeTab === 'goals' && (
            <div className="space-y-4">
              {/* Filter pills */}
              <div className="flex flex-wrap gap-2">
                {['all', 'monthly', 'quarterly', 'annual'].map(f => (
                  <motion.button key={f} onClick={() => setFilterType(f)}
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      filterType === f
                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25'
                        : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
                    }`}>{capitalize(f)}</motion.button>
                ))}
              </div>

              {/* Loading */}
              {loading ? (
                <div className="flex justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center
                    rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
                  <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
                    <Target size={26} className="text-primary-500" />
                  </div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No goals yet</h3>
                  <p className="text-sm text-gray-400 mb-5">Click "+ Add Goal" to set your first KPI target</p>
                  <Button onClick={() => { setEditGoal(null); setShowModal(true) }}>
                    <Plus size={15} /> Add Goal
                  </Button>
                </motion.div>
              ) : (
                filtered.map((goal, i) => {
                  const completion   = gVal(goal, 'completion_percent', 'completionPercent') ?? 0
                  const approval     = gVal(goal, 'approval_status',    'approvalStatus')    || 'pending'
                  const kpiMetric    = gVal(goal, 'kpi_metric',         'kpiMetric')         || ''
                  const dueDate      = gVal(goal, 'due_date',           'dueDate')           || ''
                  const status       = goal.status || 'not_started'
                  const evidenceArr  = Array.isArray(goal.evidence) ? goal.evidence : []

                  return (
                    <motion.div key={goal.id}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07, type: 'spring', stiffness: 120 }}>
                      <Card hover>
                        <CardBody>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                                  {goal.title}
                                </h3>
                                <Badge label={goal.type}  color={typeColors[goal.type]  || typeColors.quarterly} />
                                <Badge label={approval}   color={approvalColors[approval] || approvalColors.pending} dot />
                                <Badge label={status.replace('_',' ')} color={statusColors[status] || statusColors.not_started} />
                              </div>
                              {goal.description && (
                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">{goal.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                {goal.period  && <span className="flex items-center gap-1"><Clock size={11} /> {goal.period}</span>}
                                {kpiMetric    && <span className="flex items-center gap-1"><Target size={11} /> {kpiMetric}</span>}
                                {dueDate      && <span>Due {formatDate(dueDate)}</span>}
                                <span>Wt: <strong className="text-gray-700 dark:text-gray-200">{goal.weightage}%</strong></span>
                              </div>
                              <ProgressBar value={completion} label="Completion" />
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                              <motion.p key={completion} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
                                className="text-2xl sm:text-3xl font-bold text-primary-500">
                                {completion}%
                              </motion.p>
                              <p className="text-xs text-gray-400 hidden sm:block -mt-2">complete</p>

                              {/* Action buttons */}
                              <div className="flex gap-1">
                                <motion.button
                                  onClick={() => { setEditGoal(goal); setShowModal(true) }}
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  title="Edit goal"
                                  className="p-1.5 rounded-lg hover:bg-primary-500/10 text-gray-400 hover:text-primary-500 transition-colors">
                                  <Edit2 size={13} />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDelete(goal.id, goal.title)}
                                  disabled={deleting === goal.id}
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  title="Delete goal"
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                                  {deleting === goal.id
                                    ? <Loader2 size={13} className="animate-spin text-red-500" />
                                    : <Trash2 size={13} />
                                  }
                                </motion.button>
                              </div>

                              {evidenceArr.length > 0 && (
                                <p className="text-xs text-gray-400">{evidenceArr.length} file(s)</p>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </div>
          )}

          {/* ── KPI Overview Tab — real data ── */}
          {activeTab === 'kpi' && (
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Target size={32} className="mx-auto mb-3 text-gray-300" />
                  <p>No KPI data — add goals first</p>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total',       value: goals.length,                                                   color: 'bg-primary-500/10 text-primary-600 dark:text-primary-400' },
                      { label: 'Completed',   value: goals.filter(g => g.status === 'completed').length,             color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
                      { label: 'In Progress', value: goals.filter(g => g.status === 'in_progress').length,           color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                      { label: 'Not Started', value: goals.filter(g => g.status === 'not_started').length,           color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
                    ].map(s => (
                      <div key={s.label} className={`p-4 rounded-2xl text-center ${s.color} border border-current/10`}>
                        <p className="text-2xl font-bold">{s.value}</p>
                        <p className="text-xs font-medium mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Per-goal KPI breakdown */}
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {goals.map((goal, i) => {
                      const completion = gVal(goal, 'completion_percent', 'completionPercent') ?? 0
                      const met        = completion >= 100
                      const kpiMetric  = gVal(goal, 'kpi_metric', 'kpiMetric') || 'Progress'
                      return (
                        <motion.div key={goal.id}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06 }}>
                          <Card>
                            <CardBody>
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{goal.title}</p>
                                  <p className="text-xs text-gray-400">{kpiMetric} · {goal.period || '—'}</p>
                                </div>
                                {met
                                  ? <span className="flex items-center gap-1 text-xs text-green-500 font-semibold">
                                      <CheckCircle size={13} /> Met
                                    </span>
                                  : <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                                      <AlertCircle size={13} /> In progress
                                    </span>
                                }
                              </div>
                              <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Target: <strong className="text-gray-700 dark:text-gray-200">100%</strong>
                                </span>
                                <span className={`font-bold text-lg ${met ? 'text-green-500' : 'text-primary-500'}`}>
                                  {completion}%
                                </span>
                              </div>
                              <ProgressBar value={completion} color={met ? 'bg-green-500' : 'bg-primary-500'} />
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                                <span>Weight: {goal.weightage}%</span>
                                <Badge label={goal.type} color={typeColors[goal.type] || typeColors.quarterly} />
                              </div>
                            </CardBody>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add/Edit Goal Modal */}
      <AnimatePresence>
        {showModal && (
          <GoalModal
            goal={editGoal}
            onClose={() => { setShowModal(false); setEditGoal(null) }}
            onSaved={load}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default EmployeeGoals
