import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Search, CheckCircle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import ProgressBar from '../../components/common/ProgressBar'
import StatCard from '../../components/common/StatCard'
import { PerformanceRadarChart } from '../../components/charts/PerformanceChart'
import { performanceService } from '../../services/performanceService'
import { api } from '../../services/api'
import { getScoreColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const SA_FIELDS = [
  { key: 'achievements',            label: '🏆 Achievements' },
  { key: 'challenges',              label: '⚠️ Challenges Faced' },
  { key: 'strengths',               label: '💪 Strengths' },
  { key: 'weaknesses',              label: '📈 Areas for Improvement' },
  { key: 'career_goals',            label: '🎯 Career Goals' },
  { key: 'manager_discussion_notes',label: '💬 Manager Discussion Notes' },
]

// ── Self Assessment Card ──────────────────────────────────────────────────────
const SelfAssessmentCard = ({ sa }) => {
  const [expanded, setExpanded] = useState(false)
  const empName = sa.employee_name || 'Unknown'

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 sm:p-5 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <Avatar name={empName} size="md" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white">{empName}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge label={sa.period} color="bg-primary-500/10 text-primary-500" />
            <Badge
              label={sa.status}
              color={sa.status === 'submitted' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}
              dot
            />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">{formatDate(sa.submitted_at || sa.updated_at)}</span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-100 dark:border-dark-600"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {SA_FIELDS.map(field => sa[field.key] ? (
                <div key={field.key}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{field.label}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-dark-700 rounded-xl p-3">
                    {sa[field.key]}
                  </p>
                </div>
              ) : null)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const HRPerformanceReviews = () => {
  const [activeTab,   setActiveTab]   = useState('reviews')
  const [selected,    setSelected]    = useState(null)
  const [search,      setSearch]      = useState('')
  const [reviews,     setReviews]     = useState([])       // ← empty, no mock
  const [assessments, setAssessments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saLoading,   setSaLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    performanceService.getAll()
      .then(d => {
        if (d?.length) setReviews(d.map(r => ({
          ...r,
          employeeName: r.employee_name || r.employeeName || 'Unknown',
          parameters:   Array.isArray(r.parameters) ? r.parameters : [],
        })))
        else setReviews([])
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))

    api.get('/self-assessment')
      .then(res => { if (res.success && res.data) setAssessments(res.data) })
      .catch(() => {})
      .finally(() => setSaLoading(false))
  }, [])

  // Stats — all real
  const totalReviews = reviews.length
  const completed    = reviews.filter(r => r.status === 'completed').length
  const avgScore     = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + (r.overall_score || r.overallScore || 0), 0) / reviews.length)
    : '—'
  const saSubmitted  = assessments.filter(a => a.status === 'submitted').length

  const filteredReviews = reviews.filter(r =>
    (r.employeeName||'').toLowerCase().includes(search.toLowerCase()) ||
    (r.cycle || '').toLowerCase().includes(search.toLowerCase())
  )
  const filteredSA = assessments.filter(a =>
    (a.employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.period || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Performance Reviews</h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Company-wide performance evaluation records</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Reviews"    value={totalReviews} color="primary" delay={0.1} />
        <StatCard title="Completed"        value={completed}    color="green"   delay={0.2} />
        <StatCard title="Avg Score"        value={avgScore}     color="blue"    delay={0.3} />
        <StatCard title="Self Assessments" value={saSubmitted}  color="yellow"  delay={0.4} subtitle="Submitted" icon={ClipboardList} />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto scrollbar-hide">
        {[
          { key: 'reviews',     label: 'Performance Reviews' },
          { key: 'assessments', label: `Self Assessments${assessments.length ? ` (${assessments.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >{tab.label}</button>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="relative w-full sm:max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={activeTab === 'reviews' ? 'Search reviews…' : 'Search assessments…'}
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── Reviews Tab ── */}
        {activeTab === 'reviews' && (
          <motion.div key="reviews" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
              </div>
            ) : filteredReviews.length === 0 ? (
              <Card>
                <CardBody className="py-16 text-center">
                  <Star size={36} className="mx-auto text-gray-300 dark:text-dark-500 mb-3" />
                  <p className="font-medium text-gray-500 dark:text-gray-400">
                    {search ? 'No reviews found' : 'No performance reviews yet'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Reviews will appear once HR creates them for employees</p>
                </CardBody>
              </Card>
            ) : (
              filteredReviews.map((review, i) => {
                const score = review.overall_score ?? review.overallScore ?? 0
                const params = Array.isArray(review.parameters) ? review.parameters : []
                return (
                  <motion.div key={review.id} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.06 }}>
                    <Card animate={false} onClick={() => setSelected(review)} className="cursor-pointer">
                      <CardBody>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <Avatar name={review.employeeName} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">{review.employeeName}</p>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              <Badge label={review.cycle}  color="bg-primary-500/10 text-primary-500" />
                              <Badge label={review.type}   color="bg-purple-500/10 text-purple-500" />
                              <Badge label={review.status}
                                color={review.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} dot />
                            </div>
                          </div>
                          <div className="flex sm:block items-center gap-3 flex-shrink-0">
                            <p className={`text-2xl sm:text-3xl font-bold ${getScoreColor(score)}`}>{score || '—'}</p>
                            <p className="text-xs text-gray-400">Overall</p>
                          </div>
                        </div>
                        {params.length > 0 && (
                          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 mt-3">
                            {params.map((p, pi) => (
                              <div key={p.name} className="text-center p-1 sm:p-1.5 rounded-lg bg-gray-50 dark:bg-dark-700">
                                <p className={`text-xs font-bold ${getScoreColor(p.score)}`}>{p.score}</p>
                                <p className="text-[9px] text-gray-400 leading-tight mt-0.5 truncate">{(p.name||'').split(' ')[0]}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </motion.div>
                )
              })
            )}
          </motion.div>
        )}

        {/* ── Self Assessments Tab ── */}
        {activeTab === 'assessments' && (
          <motion.div key="assessments" initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} className="space-y-3">
            {saLoading ? (
              <div className="flex justify-center py-16">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
              </div>
            ) : filteredSA.length === 0 ? (
              <Card>
                <CardBody className="py-16 text-center">
                  <ClipboardList size={36} className="mx-auto text-gray-300 dark:text-dark-500 mb-3" />
                  <p className="font-medium text-gray-500 dark:text-gray-400">
                    {search ? 'No results found' : 'No self assessments submitted yet'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Employees can submit from their Self Assessment page</p>
                </CardBody>
              </Card>
            ) : (
              filteredSA.map(sa => <SelfAssessmentCard key={sa.id} sa={sa} />)
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Review Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Review — ${selected?.employeeName}`} size="xl">
        {selected && (() => {
          const score  = selected.overall_score ?? selected.overallScore ?? 0
          const params = Array.isArray(selected.parameters) ? selected.parameters : []
          const radarData = params.map(p => ({ name: (p.name||'').substring(0, 10), score: p.score }))
          return (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Overall Score', val: score, color: getScoreColor(score), big: true },
                  { label: 'Review Period', val: selected.cycle, color: 'text-gray-900 dark:text-white' },
                  { label: 'Status', val: null, badge: true },
                ].map((s) => (
                  <div key={s.label} className="text-center p-4 rounded-xl bg-gray-50 dark:bg-dark-700">
                    {s.badge
                      ? <Badge label={selected.status} color={selected.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} dot />
                      : <p className={`${s.big ? 'text-3xl' : 'text-lg'} font-bold ${s.color}`}>{s.val}</p>
                    }
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {params.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-3">Parameter Breakdown</h4>
                  <div className="space-y-2">
                    {params.map((p) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 w-32 flex-shrink-0">{p.name}</p>
                        <div className="flex-1"><ProgressBar value={p.score} size="sm" showPercent={false} /></div>
                        <span className={`text-xs font-bold w-8 text-right ${getScoreColor(p.score)}`}>{p.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {radarData.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-2">Performance Radar</h4>
                  <PerformanceRadarChart data={radarData} />
                </div>
              )}
              {(selected.manager_comments || selected.managerComments) && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-700 border-l-4 border-primary-500">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Manager Comments</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selected.manager_comments || selected.managerComments}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={() => { toast.success('HR approval recorded! ✅'); setSelected(null) }}>
                  <CheckCircle size={15} /> Approve
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </motion.div>
  )
}

export default HRPerformanceReviews
