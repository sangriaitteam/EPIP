import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Edit2, Plus, MapPin, Mail, Phone, Calendar, Briefcase,
  BookOpen, Award, User, Camera, X, Check, Loader2
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import { employeeService } from '../../services/employeeService'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 15 } } }

const inputCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

// ── Avatar with upload ────────────────────────────────────────────────────────
const ProfileAvatar = ({ name, avatarUrl, empId, onUploaded }) => {
  const fileRef  = useRef(null)
  const [preview,   setPreview]   = useState(avatarUrl || null)
  const [uploading, setUploading] = useState(false)
  const { updateAvatar } = useAuth()

  // Update preview when parent data changes
  useEffect(() => { setPreview(avatarUrl || null) }, [avatarUrl])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be under 5 MB'); return }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const result = await employeeService.uploadAvatar(empId, file)
      if (result?.avatar_url) {
        setPreview(result.avatar_url)
        onUploaded(result.avatar_url)
        updateAvatar(result.avatar_url)   // ← sync Sidebar + Navbar immediately
        toast.success('Profile photo updated ✅')
      } else {
        toast.error('Upload failed — try again')
        setPreview(avatarUrl || null)
      }
    } catch {
      toast.error('Cannot connect to server')
      setPreview(avatarUrl || null)
    }
    setUploading(false)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  // Initials fallback
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="relative flex-shrink-0 group">
      {/* Avatar circle */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-dark-800 shadow-lg bg-primary-500 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl sm:text-3xl font-bold text-white select-none">{initials}</span>
        )}
        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 size={22} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Camera button */}
      <motion.button
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => !uploading && fileRef.current?.click()}
        disabled={uploading}
        title="Change profile photo"
        className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 hover:bg-primary-600
          rounded-full flex items-center justify-center text-white shadow-lg
          border-2 border-white dark:border-dark-800 transition-colors disabled:opacity-60"
      >
        <Camera size={13} />
      </motion.button>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, children, onEdit, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 120 }}>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={16} className="text-primary-500" />}
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
          </div>
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit2 size={13} /> Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  </motion.div>
)

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-dark-700 last:border-0">
    <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 mr-2">{label}</span>
    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize text-right max-w-[120px] sm:max-w-[200px] truncate">{value || '—'}</span>
  </div>
)

// ── Personal Info Edit Modal ──────────────────────────────────────────────────
const EditPersonalModal = ({ empData, onClose, onSaved }) => {
  const [form,   setForm]   = useState({
    phone:    empData?.phone    || '',
    location: empData?.location || '',
    bio:      empData?.bio      || '',
  })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await employeeService.updateMyProfile(form)
      if (result) {
        toast.success('Profile updated ✅')
        onSaved(result)
        onClose()
      } else {
        toast.error('Update failed — try again')
      }
    } catch {
      toast.error('Cannot connect to server')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-md
          rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <User size={16} className="text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Edit Personal Info</h3>
              <p className="text-xs text-gray-400">Update your contact details</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Phone */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Phone size={13} className="text-gray-400" /> Phone Number
            </label>
            <input
              value={form.phone}
              onChange={e => setF('phone', e.target.value)}
              placeholder="e.g. 9741485408"
              className={inputCls}
              type="tel"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <MapPin size={13} className="text-gray-400" /> Location
            </label>
            <input
              value={form.location}
              onChange={e => setF('location', e.target.value)}
              placeholder="e.g. Shimoga, Karnataka"
              className={inputCls}
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Edit2 size={13} className="text-gray-400" /> Short Bio
            </label>
            <textarea
              value={form.bio}
              onChange={e => setF('bio', e.target.value)}
              placeholder="Tell a little about yourself…"
              rows={3}
              className={`${inputCls} resize-none`}
              maxLength={200}
            />
            <p className="text-xs text-gray-400 text-right">{form.bio.length}/200</p>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Edit2 size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Name, email, designation and department can only be updated by HR / Admin.
            </p>
          </div>
        </div>

        {/* Footer */}
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
              : <><Check size={14} /> Save Changes</>
            }
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
const EmployeeProfile = () => {
  const { user } = useAuth()
  const [activeTab,       setActiveTab]       = useState('overview')
  const [empData,         setEmpData]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [showEditPersonal,setShowEditPersonal]= useState(false)

  useEffect(() => {
    employeeService.getMyProfile()
      .then(d => { if (d) setEmpData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'overview',  label: 'Overview' },
    { key: 'education', label: 'Education & Exp.' },
    { key: 'skills',    label: 'Skills & Certs' },
    { key: 'documents', label: 'Documents' },
  ]

  // Safe accessors
  const name        = empData?.name || `${empData?.first_name||''} ${empData?.last_name||''}`.trim() || 'Employee'
  const status      = empData?.status || 'active'
  const workMode    = empData?.work_mode || empData?.workMode || '—'
  const designation = empData?.designation || '—'
  const department  = empData?.department_name || empData?.department || '—'
  const email       = empData?.email || '—'
  const phone       = empData?.phone || '—'
  const location    = empData?.location || '—'
  const joinDate    = empData?.join_date || empData?.joinDate
  const empId       = empData?.employee_id || empData?.id || '—'
  const manager     = empData?.manager || '—'
  const completion  = empData?.profile_completion ?? empData?.profileCompletion ?? 0
  const avatarUrl   = empData?.avatar_url || null
  const dbId        = empData?.id  // numeric DB id for avatar upload

  const education      = Array.isArray(empData?.education)      ? empData.education      : []
  const experience     = Array.isArray(empData?.experience)     ? empData.experience     : []
  const skills         = Array.isArray(empData?.skills)         ? empData.skills         : []
  const certifications = Array.isArray(empData?.certifications) ? empData.certifications : []

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl">

      {/* ── Profile Header ── */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardBody className="py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

              {/* Avatar with upload */}
              <ProfileAvatar
                name={name}
                avatarUrl={avatarUrl}
                empId={dbId}
                onUploaded={url => setEmpData(d => ({ ...d, avatar_url: url }))}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{name}</h2>
                  <Badge label={status}   color="text-green-500 bg-green-500/10" dot />
                  <Badge label={workMode} color="bg-primary-500/10 text-primary-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{designation} · {department}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {[
                    [Mail,     email],
                    [Phone,    phone],
                    [MapPin,   location],
                    [Calendar, `Joined ${joinDate ? formatDate(joinDate) : '—'}`],
                  ].map(([Icon, text]) => (
                    <span key={text} className="flex items-center gap-1.5">
                      <Icon size={13} className="text-gray-400" />{text}
                    </span>
                  ))}
                </div>
                {/* Bio if present */}
                {empData?.bio && (
                  <p className="mt-2 text-xs text-gray-400 italic max-w-md">{empData.bio}</p>
                )}
              </div>

              {/* Completion */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <p className="text-xs text-gray-400">Profile Completion</p>
                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
                  className="text-2xl sm:text-3xl font-bold text-primary-500">{completion}%</motion.p>
                <ProgressBar value={completion} className="w-32" size="sm" showPercent={false} color="bg-primary-500" />
                <p className="text-xs text-gray-400 font-mono">ID: {empId}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div variants={fadeUp}
        className="flex gap-1 border-b border-gray-200 dark:border-dark-600 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employment — read-only for employee */}
              <Section title="Employment Details" icon={Briefcase} delay={0.1}>
                <div>
                  {[
                    ['Employee ID', empId],
                    ['Department',  department],
                    ['Designation', designation],
                    ['Manager',     manager],
                    ['Work Mode',   workMode],
                    ['Join Date',   joinDate ? formatDate(joinDate) : '—'],
                  ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
                </div>
              </Section>

              {/* Personal Info — editable */}
              <Section title="Personal Info" icon={User} delay={0.15}
                onEdit={() => setShowEditPersonal(true)}>
                <div>
                  {[
                    ['Full Name', name],
                    ['Email',     email],
                    ['Phone',     phone],
                    ['Location',  location],
                  ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
                  {empData?.bio && (
                    <div className="mt-2 pt-2 border-t border-gray-50 dark:border-dark-700">
                      <p className="text-xs text-gray-400 mb-0.5">Bio</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{empData.bio}</p>
                    </div>
                  )}
                </div>
              </Section>
            </div>
          )}

          {/* Education */}
          {activeTab === 'education' && (
            <div className="space-y-4">
              <Section title="Education" icon={BookOpen} delay={0.1}
                onEdit={() => toast.success('Edit — HR/Admin can update education records')}>
                <div className="space-y-3">
                  {education.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-4">No education records added yet</p>
                    : education.map((edu, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-l-4 border-primary-500">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{edu.degree}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{edu.institution} · {edu.year}</p>
                      </motion.div>
                    ))
                  }
                </div>
              </Section>
              <Section title="Work Experience" icon={Briefcase} delay={0.2}
                onEdit={() => toast.success('Edit — HR/Admin can update experience records')}>
                <div className="space-y-3">
                  {experience.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-4">No experience records added yet</p>
                    : experience.map((exp, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border-l-4 border-purple-500">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{exp.role}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{exp.company} · {exp.duration}</p>
                      </motion.div>
                    ))
                  }
                </div>
              </Section>
            </div>
          )}

          {/* Skills */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <Section title="Skills" delay={0.1}
                onEdit={() => toast.success('Skills can be updated by HR/Admin')}>
                <div className="flex flex-wrap gap-2">
                  {skills.length === 0
                    ? <p className="text-sm text-gray-400 py-2">No skills added yet</p>
                    : skills.map((skill, i) => (
                      <motion.span key={skill}
                        initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06, type: 'spring' }} whileHover={{ scale: 1.08 }}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary-500/10
                          text-primary-600 dark:text-primary-400 border border-primary-500/20 cursor-default">
                        {skill}
                      </motion.span>
                    ))
                  }
                </div>
              </Section>
              <Section title="Certifications" icon={Award} delay={0.15}
                onEdit={() => toast.success('Certifications can be updated by HR/Admin')}>
                <div className="space-y-3">
                  {certifications.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-4">No certifications added yet</p>
                    : certifications.map((cert, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-700">
                        <motion.div whileHover={{ rotate: 20 }}>
                          <Award size={18} className="text-yellow-500" />
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{cert.name}</p>
                          <p className="text-xs text-gray-400">Obtained {cert.year}</p>
                        </div>
                      </motion.div>
                    ))
                  }
                </div>
              </Section>
            </div>
          )}

          {/* Documents */}
          {activeTab === 'documents' && (
            <Section title="Uploaded Documents" delay={0.1}>
              <div className="space-y-3">
                {[
                  { label: 'Stamp Size Photo',    url: empData?.photo_url            || empData?.verification?.photo_url },
                  { label: 'Aadhaar Card',         url: empData?.aadhaar_url           || empData?.verification?.aadhaar_url },
                  { label: '10th Marks Card',      url: empData?.marks_10th_url        || empData?.verification?.marks_10th_url },
                  { label: '12th Marks Card',      url: empData?.marks_12th_url        || empData?.verification?.marks_12th_url },
                  { label: 'Degree Marksheet',     url: empData?.degree_marksheet_url  || empData?.verification?.degree_marksheet_url },
                  { label: 'Degree Certificate',   url: empData?.degree_url            || empData?.verification?.degree_url },
                  { label: 'Diploma Marksheet',    url: empData?.diploma_marksheet_url || empData?.verification?.diploma_marksheet_url },
                  { label: 'Diploma Certificate',  url: empData?.diploma_cert_url      || empData?.verification?.diploma_cert_url },
                  { label: 'Experience Letter',    url: empData?.experience_letter_url || empData?.verification?.experience_letter_url },
                  { label: 'Relieving Letter',     url: empData?.relieving_letter_url  || empData?.verification?.relieving_letter_url },
                ].filter(d => d.url).map((doc, i) => (
                  <motion.a key={doc.label} href={doc.url} target="_blank" rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700
                      hover:bg-primary-500/10 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-primary-500" />
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200
                        group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {doc.label}
                      </span>
                    </div>
                    <span className="text-xs text-primary-500 font-medium">View →</span>
                  </motion.a>
                ))}

                {![empData?.photo_url, empData?.aadhaar_url, empData?.marks_10th_url].some(Boolean) && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-4">
                      <BookOpen size={24} className="text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No documents uploaded yet</p>
                    <p className="text-xs text-gray-400 mt-1">Documents are uploaded during first-login verification</p>
                  </motion.div>
                )}
              </div>
            </Section>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Edit Personal Info Modal */}
      <AnimatePresence>
        {showEditPersonal && (
          <EditPersonalModal
            empData={empData}
            onClose={() => setShowEditPersonal(false)}
            onSaved={updated => setEmpData(d => ({ ...d, ...updated }))}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default EmployeeProfile
