import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, CheckCircle, XCircle, Clock, Search, Filter, MessageSquare, X } from 'lucide-react'
import Card, { CardBody } from '../../components/common/Card'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import { api } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const statusColor = (s) => {
  if (s === 'approved') return 'bg-green-500/10 text-green-600 dark:text-green-400'
  if (s === 'rejected') return 'bg-red-500/10 text-red-500'
  return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
}
const leaveTypeColor = (t) => {
  if (t === 'sick')    return 'bg-red-500/10 text-red-500'
  if (t === 'earned')  return 'bg-blue-500/10 text-blue-500'
  if (t === 'unpaid')  return 'bg-gray-500/10 text-gray-500'
  return 'bg-purple-500/10 text-purple-500'
}

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

// ── Review Modal ──────────────────────────────────────────────────────────────
const ReviewModal = ({ leave, onClose, onDone }) => {
  const [note,     setNote]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [decision, setDecision] = useState(null) // 'approved' | 'rejected'

  const handleReview = async (status) => {
    setDecision(status)
    setSaving(true)
    try {
      const res = await api.patch(`/leaves/${leave.id}`, { status, reviewer_note: note || undefined })
      if (res.success) {
        toast.success(`Leave request ${status}!`)
        onDone()
        onClose()
      } else {
        toast.error(res.message || 'Failed to update')
      }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
    setDecision(null)
  }

  const empName = `${leave.first_name} ${leave.last_name}`

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
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Review Leave Request</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Employee info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-700 mb-4">
          <Avatar name={empName} size="md" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{empName}</p>
            <p className="text-xs text-gray-400">{leave.designation || '—'} · {leave.department_name || '—'}</p>
          </div>
        </div>

        {/* Leave details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Leave Type</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${leaveTypeColor(leave.leave_type)}`}>
              {leave.leave_type}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Duration</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatDate(leave.start_date)} → {formatDate(leave.end_date)} ({leave.days} day{leave.days > 1 ? 's' : ''})
            </span>
          </div>
          {leave.reason && (
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Employee Reason</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{leave.reason}</p>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <MessageSquare size={13} className="inline mr-1" />
            Note to Employee (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note or reason for your decision..."
            rows={2}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleReview('rejected')}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white disabled:opacity-50 transition-all"
          >
            {saving && decision === 'rejected'
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full" />
              : <XCircle size={15} />
            }
            Reject
          </button>
          <button
            onClick={() => handleReview('approved')}
            disabled={saving}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-all"
          >
            {saving && decision === 'approved'
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <CheckCircle size={15} />
            }
            Approve
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const HRLeaveRequests = () => {
  const [leaves,    setLeaves]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('pending')
  const [search,    setSearch]    = useState('')
  const [reviewing, setReviewing] = useState(null)

  const loadLeaves = async (status = filter) => {
    setLoading(true)
    try {
      const res = await api.get(`/leaves?status=${status}`)
      if (res.success) setLeaves(res.data)
    } catch { toast.error('Failed to load leave requests') }
    setLoading(false)
  }

  useEffect(() => { loadLeaves(filter) }, [filter])

  const filtered = leaves.filter(l => {
    const name = `${l.first_name} ${l.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase()) ||
           l.leave_type.includes(search.toLowerCase()) ||
           (l.department_name || '').toLowerCase().includes(search.toLowerCase())
  })

  const pending   = leaves.filter(l => l.status === 'pending').length
  const approved  = leaves.filter(l => l.status === 'approved').length
  const rejected  = leaves.filter(l => l.status === 'rejected').length

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Leave Requests</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review and manage employee leave applications</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard title="Pending"  value={pending}  subtitle="Awaiting review" icon={Clock}        color="yellow" delay={0.1} />
        <StatCard title="Approved" value={approved} subtitle="This period"    icon={CheckCircle}  color="green"  delay={0.2} />
        <StatCard title="Rejected" value={rejected} subtitle="This period"    icon={XCircle}      color="red"    delay={0.3} />
      </motion.div>

      {/* Filters + Search */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or department..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: 'pending',  label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'all',      label: 'All' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </motion.div>

      {/* Leave cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <Calendar size={36} className="mx-auto text-gray-300 dark:text-dark-500 mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? 'No results found' : `No ${filter === 'all' ? '' : filter} leave requests`}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((leave, i) => {
              const empName = `${leave.first_name} ${leave.last_name}`
              return (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Employee info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar name={empName} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{empName}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {leave.designation || '—'} · {leave.department_name || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Leave info */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${leaveTypeColor(leave.leave_type)}`}>
                        {leave.leave_type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(leave.start_date)} → {formatDate(leave.end_date)}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {leave.days} day{leave.days > 1 ? 's' : ''}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </div>

                    {/* Action */}
                    {leave.status === 'pending' && (
                      <button
                        onClick={() => setReviewing(leave)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 transition-all"
                      >
                        <Filter size={12} /> Review
                      </button>
                    )}
                  </div>

                  {/* Reason + note */}
                  {(leave.reason || leave.reviewer_note) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-600 space-y-1.5">
                      {leave.reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Reason: </span>
                          {leave.reason}
                        </p>
                      )}
                      {leave.reviewer_note && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-medium text-gray-600 dark:text-gray-300">HR Note: </span>
                          {leave.reviewer_note}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Submitted time */}
                  <p className="text-[10px] text-gray-400 mt-2">
                    Submitted {formatDate(leave.created_at)}
                    {leave.reviewed_by_name && ` · Reviewed by ${leave.reviewed_by_name}`}
                  </p>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {reviewing && (
          <ReviewModal
            leave={reviewing}
            onClose={() => setReviewing(null)}
            onDone={() => loadLeaves(filter)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default HRLeaveRequests
