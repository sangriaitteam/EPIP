import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Edit2, CheckCircle, Save, Loader } from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import { Textarea } from '../../components/common/Input'
import { api } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const FIELDS = [
  { key: 'achievements',            label: '🏆 Achievements',             placeholder: 'List key accomplishments this period...' },
  { key: 'challenges',              label: '⚠️ Challenges Faced',         placeholder: 'Describe challenges and how you handled them...' },
  { key: 'strengths',               label: '💪 Strengths',                placeholder: 'What are your core strengths?' },
  { key: 'weaknesses',              label: '📈 Areas for Improvement',    placeholder: 'What would you like to improve?' },
  { key: 'career_goals',            label: '🎯 Career Goals',             placeholder: 'Where do you see yourself in 2–3 years?' },
  { key: 'manager_discussion_notes',label: '💬 Manager Discussion Notes', placeholder: 'Notes from your last 1:1 with manager...' },
]

const EMPTY_FORM = {
  achievements: '', challenges: '', strengths: '',
  weaknesses: '', career_goals: '', manager_discussion_notes: '',
}

const currentPeriod = () => {
  const d = new Date()
  return `Q${Math.ceil((d.getMonth() + 1) / 3)}-${d.getFullYear()}`
}

const EmployeeSelfAssessment = () => {
  const [assessment, setAssessment] = useState(null)   // saved record from DB
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [editing,    setEditing]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading,    setLoading]    = useState(true)

  const period = currentPeriod()

  // Load existing assessment
  const loadAssessment = async () => {
    try {
      const res = await api.get(`/self-assessment/my?period=${period}`)
      if (res.success && res.data) {
        setAssessment(res.data)
        setForm({
          achievements:             res.data.achievements             || '',
          challenges:               res.data.challenges               || '',
          strengths:                res.data.strengths                || '',
          weaknesses:               res.data.weaknesses               || '',
          career_goals:             res.data.career_goals             || '',
          manager_discussion_notes: res.data.manager_discussion_notes || '',
        })
      } else {
        // No assessment yet — start in edit mode
        setEditing(true)
      }
    } catch {
      setEditing(true)
    }
    setLoading(false)
  }

  useEffect(() => { loadAssessment() }, [])

  // Save draft
  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await api.post('/self-assessment', { ...form, period })
      if (res.success) {
        setAssessment(res.data)
        setEditing(false)
        toast.success('Assessment saved as draft ✅')
      } else {
        toast.error(res.message || 'Failed to save')
      }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  // Submit to manager
  const handleSubmit = async () => {
    if (!assessment?.id) {
      // Save first then submit
      setSaving(true)
      try {
        const saveRes = await api.post('/self-assessment', { ...form, period })
        if (!saveRes.success) { toast.error('Failed to save before submit'); setSaving(false); return }
        setAssessment(saveRes.data)
        const submitRes = await api.post(`/self-assessment/${saveRes.data.id}/submit`)
        if (submitRes.success) {
          setAssessment(submitRes.data)
          setEditing(false)
          toast.success('Submitted to manager! 🎉')
        } else toast.error(submitRes.message || 'Submit failed')
      } catch { toast.error('Cannot connect to server') }
      setSaving(false)
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post(`/self-assessment/${assessment.id}/submit`)
      if (res.success) {
        setAssessment(res.data)
        setEditing(false)
        toast.success('Submitted to manager! 🎉')
      } else toast.error(res.message || 'Submit failed')
    } catch { toast.error('Cannot connect to server') }
    setSubmitting(false)
  }

  const isSubmitted = assessment?.status === 'submitted'
  const isDraft     = assessment?.status === 'draft'

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-3xl">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Self Assessment</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Period: {period}</p>
        </div>
        <div className="flex items-center gap-2">
          {assessment && (
            <Badge
              label={assessment.status}
              color={isSubmitted ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}
              dot
            />
          )}
          <AnimatePresence mode="wait">
            {!editing && !isSubmitted ? (
              <motion.div key="edit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit2 size={13} /> Edit
                </Button>
              </motion.div>
            ) : editing ? (
              <motion.div key="save" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <Button variant="success" size="sm" onClick={handleSave} disabled={saving}>
                  {saving
                    ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Saving…</>
                    : <><Save size={13} /> Save Draft</>
                  }
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Submitted banner */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20"
          >
            <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Assessment Submitted</p>
              <p className="text-xs text-green-600/70 dark:text-green-500/70">
                Submitted on {formatDate(assessment.submitted_at || assessment.updated_at)} · Awaiting manager review
              </p>
            </div>
          </motion.div>
        )}
        {isDraft && !editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
          >
            <Loader size={16} className="text-yellow-500" />
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Draft saved · Click <strong>Edit</strong> to update or <strong>Submit</strong> to send to manager.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fields */}
      <div className="space-y-4">
        {FIELDS.map((field, i) => (
          <motion.div key={field.key} variants={fadeUp} custom={i}>
            <Card animate={false}>
              <CardHeader>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{field.label}</h3>
              </CardHeader>
              <CardBody>
                <AnimatePresence mode="wait">
                  {editing ? (
                    <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Textarea
                        value={form[field.key]}
                        onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={4}
                      />
                    </motion.div>
                  ) : (
                    <motion.p
                      key="view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
                    >
                      {form[field.key] || (
                        <span className="text-gray-400 dark:text-gray-600 italic">Not filled yet</span>
                      )}
                    </motion.p>
                  )}
                </AnimatePresence>
              </CardBody>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Footer actions */}
      {!isSubmitted && (
        <motion.div variants={fadeUp} className="flex justify-end gap-3 pt-2">
          {editing && (
            <Button variant="ghost" onClick={() => {
              setEditing(false)
              if (!assessment) setForm(EMPTY_FORM)
            }}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={submitting || saving}>
            {submitting
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Submitting…</>
              : <><Send size={15} /> Submit to Manager</>
            }
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}

export default EmployeeSelfAssessment
