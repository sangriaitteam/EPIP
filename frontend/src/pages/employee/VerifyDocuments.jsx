import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, CreditCard, Phone, MapPin, Camera, BookOpen,
  Briefcase, CheckCircle, ChevronRight, ChevronLeft,
  Upload, Shield, AlertCircle, Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ── Steps config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: 'Personal Info',   icon: User,        desc: 'Name, DOB, Gender' },
  { id: 2, title: 'Company ID',      icon: CreditCard,  desc: 'ID, Dept & Designation' },
  { id: 3, title: 'Contact',         icon: Phone,       desc: 'Mobile & OTP' },
  { id: 4, title: 'Address',         icon: MapPin,      desc: 'Your address' },
  { id: 5, title: 'Photo & Aadhaar', icon: Camera,      desc: 'Photo + Aadhaar card' },
  { id: 6, title: 'Qualifications',  icon: BookOpen,    desc: 'Education docs' },
  { id: 7, title: 'Experience',      icon: Briefcase,   desc: 'Work history' },
  { id: 8, title: 'Bank Details',    icon: CreditCard,  desc: 'Account information' },
  { id: 9, title: 'Review & Submit', icon: CheckCircle, desc: 'Final review' },
]

// ── Reusable components ───────────────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
)

const TextInput = ({ ...props }) => (
  <input
    {...props}
    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
               bg-white dark:bg-dark-700 text-gray-900 dark:text-white
               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500
               focus:border-transparent transition-all"
  />
)

const SelectInput = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
               bg-white dark:bg-dark-700 text-gray-900 dark:text-white
               focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
  >
    {children}
  </select>
)

const UploadBox = ({ label, accept, onChange, file, hint, required }) => (
  <div
    onClick={() => document.getElementById(`upload-${label.replace(/\s+/g,'_')}`).click()}
    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
      ${file
        ? 'border-green-500 bg-green-500/5'
        : 'border-gray-300 dark:border-dark-500 hover:border-primary-500 hover:bg-primary-500/5'
      }`}
  >
    <input
      id={`upload-${label.replace(/\s+/g,'_')}`}
      type="file"
      accept={accept}
      className="hidden"
      onChange={onChange}
    />
    {file ? (
      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
        <CheckCircle size={18} />
        <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
      </div>
    ) : (
      <>
        <Upload size={22} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </>
    )}
  </div>
)

// ── Main Component ────────────────────────────────────────────────────────────
const VerifyDocuments = () => {
  const [step,       setStep]       = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const { user, logout, completeFirstLogin } = useAuth()
  const { theme } = useTheme()
  const navigate  = useNavigate()
  const isDark    = theme === 'dark'

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Step 1
    fullName: user?.name || '',
    dob: '',
    gender: '',
    // Step 2
    companyId: '',
    department: '',
    designation: '',
    // Step 3
    contactNumber: '',
    alternateNumber: '',
    // Step 4
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    // Step 5
    photo: null,
    aadhaarCard: null,
    // Step 6
    educationType: '',
    marks10th: null,
    marks12th: null,
    degreeMarksheet: null,
    degreeCertificate: null,
    diplomaMarksheet: null,
    diplomaCertificate: null,
    // Step 7
    hasExperience: 'no',
    experienceLetter: null,
    relievingLetter: null,
    // Step 8 — Bank Details
    bankAccountName:   '',
    bankAccountNumber: '',
    bankIfscCode:      '',
    bankBranch:        '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── File validation helpers ───────────────────────────────────────────────
  const MAX_PHOTO_KB   = 150
  const MAX_DOC_KB     = 500
  const MAX_AADHAAR_KB = 500

  const checkFileSize = (file, maxKB, label) => {
    if (file && file.size > maxKB * 1024) {
      toast.error(`${label} must be under ${maxKB}KB (current: ${Math.round(file.size/1024)}KB)`)
      return false
    }
    return true
  }

  const checkImageOnly = (file, label) => {
    const allowed = ['image/jpeg','image/png','image/jpg']
    if (file && !allowed.includes(file.type)) {
      toast.error(`${label} must be JPG or PNG image only`)
      return false
    }
    return true
  }

  const checkDocFile = (file, label) => {
    const allowed = ['image/jpeg','image/png','image/jpg','application/pdf']
    if (file && !allowed.includes(file.type)) {
      toast.error(`${label} must be JPG, PNG or PDF`)
      return false
    }
    return true
  }

  // ── Step validation ───────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step === 1) {
      if (!form.fullName.trim()) { toast.error('Full name is required'); return }
      if (!form.dob)             { toast.error('Date of birth is required'); return }
      if (!form.gender)          { toast.error('Gender is required'); return }
    }

    if (step === 2) {
      if (!form.companyId.trim()) { toast.error('Company ID is required'); return }
      if (!form.department)       { toast.error('Department is required'); return }
      if (!form.designation)      { toast.error('Designation is required'); return }

      // Check duplicate Company ID in DB
      try {
        const token = localStorage.getItem('epip_token')
        const res = await fetch(`${BASE_URL}/employees/verify-documents/check-id?company_id=${encodeURIComponent(form.companyId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.exists) {
          toast.error('This Company ID is already registered to another employee. Please check with HR.')
          return
        }
      } catch {} // If check fails, allow to continue
    }

    if (step === 3) {
      if (!form.contactNumber || form.contactNumber.length < 10) {
        toast.error('Valid 10-digit contact number is required'); return
      }
    }

    if (step === 4) {
      if (!form.addressLine1.trim()) { toast.error('Address Line 1 is required'); return }
      if (!form.city.trim())         { toast.error('City is required'); return }
      if (!form.state.trim())        { toast.error('State is required'); return }
      if (form.pincode.length < 6)   { toast.error('Valid PIN code is required'); return }
    }

    if (step === 5) {
      // Photo — JPG/PNG only, max 50KB
      if (!form.photo) { toast.error('Please upload your stamp size photo'); return }
      if (!checkImageOnly(form.photo, 'Stamp size photo')) return
      if (!checkFileSize(form.photo, MAX_PHOTO_KB, 'Stamp size photo')) return

      // Aadhaar — JPG/PNG only (no PDF), max 500KB
      if (!form.aadhaarCard) { toast.error('Please upload your Aadhaar card'); return }
      if (!checkImageOnly(form.aadhaarCard, 'Aadhaar card')) return
      if (!checkFileSize(form.aadhaarCard, MAX_AADHAAR_KB, 'Aadhaar card')) return
    }

    if (step === 6) {
      // All educational documents are optional — just validate file type/size if uploaded
      if (form.marks10th)         { if (!checkDocFile(form.marks10th, '10th marks card')) return; if (!checkFileSize(form.marks10th, MAX_DOC_KB, '10th marks card')) return }
      if (form.marks12th)         { if (!checkDocFile(form.marks12th, '12th marks card')) return; if (!checkFileSize(form.marks12th, MAX_DOC_KB, '12th marks card')) return }
      if (form.degreeCertificate) { if (!checkDocFile(form.degreeCertificate, 'Degree certificate')) return; if (!checkFileSize(form.degreeCertificate, MAX_DOC_KB, 'Degree certificate')) return }
      if (form.diplomaMarksheet)  { if (!checkDocFile(form.diplomaMarksheet, 'Diploma marksheet')) return; if (!checkFileSize(form.diplomaMarksheet, MAX_DOC_KB, 'Diploma marksheet')) return }
      if (form.diplomaCertificate){ if (!checkDocFile(form.diplomaCertificate, 'Diploma certificate')) return; if (!checkFileSize(form.diplomaCertificate, MAX_DOC_KB, 'Diploma certificate')) return }
    }

    if (step === 7) {
      // Experience documents are optional — just validate if uploaded
      if (form.experienceLetter) { if (!checkDocFile(form.experienceLetter, 'Experience letter')) return; if (!checkFileSize(form.experienceLetter, MAX_DOC_KB, 'Experience letter')) return }
      if (form.relievingLetter)  { if (!checkDocFile(form.relievingLetter, 'Relieving letter')) return; if (!checkFileSize(form.relievingLetter, MAX_DOC_KB, 'Relieving letter')) return }
    }

    if (step === 8) {
      if (!form.bankAccountName.trim())   { toast.error('Account holder name is required'); return }
      if (!form.bankAccountNumber.trim()) { toast.error('Account number is required'); return }
      if (form.bankAccountNumber.length < 9) { toast.error('Enter a valid account number'); return }
      if (!form.bankIfscCode.trim())      { toast.error('IFSC code is required'); return }
      if (form.bankIfscCode.length !== 11){ toast.error('IFSC code must be 11 characters'); return }
      if (!form.bankBranch.trim())        { toast.error('Branch name is required'); return }
    }

    setStep(s => Math.min(s + 1, STEPS.length))
  }

  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  // ── Submit — real multipart/FormData ─────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const fd = new FormData()

      // Text fields
      fd.append('full_name',        form.fullName)
      fd.append('dob',              form.dob)
      fd.append('gender',           form.gender)
      fd.append('company_id',       form.companyId)
      fd.append('department',       form.department)
      fd.append('designation',      form.designation)
      fd.append('contact_number',   form.contactNumber)
      if (form.alternateNumber) fd.append('alternate_number', form.alternateNumber)
      fd.append('address_line1',    form.addressLine1)
      if (form.addressLine2) fd.append('address_line2', form.addressLine2)
      fd.append('city',             form.city)
      fd.append('state',            form.state)
      fd.append('pincode',          form.pincode)
      fd.append('has_experience',   form.hasExperience)
      fd.append('education_type',   form.educationType)
      // Bank details
      if (form.bankAccountName)   fd.append('bank_account_name',   form.bankAccountName)
      if (form.bankAccountNumber) fd.append('bank_account_number', form.bankAccountNumber)
      if (form.bankIfscCode)      fd.append('bank_ifsc_code',      form.bankIfscCode)
      if (form.bankBranch)        fd.append('bank_branch',         form.bankBranch)

      // File fields
      if (form.photo)             fd.append('photo',               form.photo)
      if (form.aadhaarCard)       fd.append('aadhaar_card',        form.aadhaarCard)
      if (form.marks10th)         fd.append('marks_10th',          form.marks10th)
      if (form.marks12th)         fd.append('marks_12th',          form.marks12th)
      if (form.degreeMarksheet)   fd.append('degree_marksheet',    form.degreeMarksheet)
      if (form.degreeCertificate) fd.append('degree_certificate',  form.degreeCertificate)
      if (form.diplomaMarksheet)  fd.append('diploma_marksheet',   form.diplomaMarksheet)
      if (form.diplomaCertificate)fd.append('diploma_certificate', form.diplomaCertificate)
      if (form.experienceLetter)  fd.append('experience_letter',   form.experienceLetter)
      if (form.relievingLetter)   fd.append('relieving_letter',    form.relievingLetter)

      const token = localStorage.getItem('epip_token')
      const res   = await fetch(`${BASE_URL}/employees/verify-documents`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body:    fd,
      })
      const data = await res.json()

      if (!data.success) {
        toast.error(data.message || 'Submission failed, please try again')
        setSubmitting(false)
        return
      }

      // Clear is_first_login in DB (localStorage already cleared by completeFirstLogin below)
      try {
        await fetch(`${BASE_URL}/auth/complete-first-login`, {
          method:  'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('epip_token')
              ? { Authorization: `Bearer ${localStorage.getItem('epip_token')}` }
              : {}),
          },
        })
      } catch { /* non-critical — localStorage still clears */ }

      completeFirstLogin()
      toast.success('Documents submitted successfully! 🎉')
      const dest = user?.role === 'hr' ? '/hr/dashboard' : '/employee/dashboard'
      setTimeout(() => navigate(dest), 1500)
    } catch (err) {
      toast.error('Network error. Please check your connection.')
      setSubmitting(false)
    }
  }

  const progress = Math.round(((step - 1) / (STEPS.length - 1)) * 100)

  // ── Experience level label map ─────────────────────────────────────────────
  const eduLabel = { degree: 'Degree / BE / B.Tech', diploma: 'Diploma' }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f1117]' : 'bg-[#f0f2f7]'} py-8 px-4`}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Sangria Edutainment Pvt Ltd</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document Verification</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete your profile to access your dashboard</p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-500" />
            <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              Required only for your first login
            </span>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span>Step {step} of {STEPS.length}</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Step pills */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {STEPS.map(s => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap
                ${s.id === step
                  ? 'bg-primary-500 text-white'
                  : s.id < step
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 cursor-pointer'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-400 cursor-default'
                }`}
            >
              {s.id < step ? <CheckCircle size={12} /> : <s.icon size={12} />}
              {s.title}
            </button>
          ))}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity:0, x:24 }}
            animate={{ opacity:1, x:0 }}
            exit={{    opacity:0, x:-24 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl border border-gray-100 dark:border-dark-600 overflow-hidden"
          >
            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-600 flex items-center gap-3">
              {(() => { const S = STEPS[step-1]; return <S.icon size={18} className="text-primary-500" /> })()}
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{STEPS[step-1].title}</h2>
                <p className="text-xs text-gray-400">{STEPS[step-1].desc}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">

              {/* ── STEP 1: Personal Info ── */}
              {step === 1 && (
                <>
                  <Field label="Full Name" required hint="Enter your name exactly as it appears on your ID">
                    <TextInput value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Full name as per Aadhaar" />
                  </Field>
                  <Field label="Date of Birth" required>
                    <TextInput type="date" value={form.dob} onChange={e => set('dob', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  </Field>
                  <Field label="Gender" required>
                    <SelectInput value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </SelectInput>
                  </Field>
                </>
              )}

              {/* ── STEP 2: Company ID ── */}
              {step === 2 && (
                <>
                  <Field label="Company Provided ID Number" required hint="e.g. EMP-2024-001">
                    <TextInput value={form.companyId} onChange={e => set('companyId', e.target.value)} placeholder="e.g. EMP-2024-001" />
                  </Field>
                  <Field label="Department" required>
                    <SelectInput value={form.department} onChange={e => set('department', e.target.value)}>
                      <option value="">Select department</option>
                      {['Sales','Marketing','Operations','HR','IT','Admin','Accountant'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Designation" required>
                    <SelectInput value={form.designation} onChange={e => set('designation', e.target.value)}>
                      <option value="">Select designation</option>
                      {['Intern','Trainee','Executive','Junior Executive','Senior Executive','Team Lead','Project Manager'].map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </SelectInput>
                  </Field>
                </>
              )}

              {/* ── STEP 3: Contact ── */}
              {step === 3 && (
                <>
                  <Field label="Contact Number" required hint="10-digit mobile number">
                    <TextInput
                      value={form.contactNumber}
                      onChange={e => set('contactNumber', e.target.value.replace(/\D/g,'').slice(0,10))}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                    />
                  </Field>

                  <Field label="Alternate Number" hint="Optional">
                    <TextInput
                      value={form.alternateNumber}
                      onChange={e => set('alternateNumber', e.target.value.replace(/\D/g,'').slice(0,10))}
                      placeholder="Optional alternate number"
                      maxLength={10}
                    />
                  </Field>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Info size={14} className="text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      HR will verify your contact number manually during onboarding.
                    </p>
                  </div>
                </>
              )}

              {/* ── STEP 4: Address ── */}
              {step === 4 && (
                <>
                  <Field label="Address Line 1" required>
                    <TextInput value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="House/Flat no, Street name" />
                  </Field>
                  <Field label="Address Line 2" hint="Optional">
                    <TextInput value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)} placeholder="Area, Landmark" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" required>
                      <TextInput value={form.city} onChange={e => set('city', e.target.value)} placeholder="City" />
                    </Field>
                    <Field label="State" required>
                      <TextInput value={form.state} onChange={e => set('state', e.target.value)} placeholder="State" />
                    </Field>
                  </div>
                  <Field label="PIN Code" required>
                    <TextInput
                      value={form.pincode}
                      onChange={e => set('pincode', e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="6-digit PIN code"
                      maxLength={6}
                    />
                  </Field>
                </>
              )}

              {/* ── STEP 5: Photo & Aadhaar ── */}
              {step === 5 && (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload a recent passport/stamp-size photo. The name and date of birth on your Aadhaar card must match your personal info.
                  </p>

                  <UploadBox
                    label="Stamp Size Photo"
                    accept="image/jpeg,image/png,image/jpg"
                    file={form.photo}
                    hint="JPG / PNG only • Max 150KB • Passport/stamp size • Background must be white"
                    required
                    onChange={e => set('photo', e.target.files[0])}
                  />
                  {form.photo && (
                    <div className="flex justify-center">
                      <img
                        src={URL.createObjectURL(form.photo)}
                        alt="Photo preview"
                        className="w-24 h-24 object-cover rounded-xl border-2 border-primary-500 shadow-lg"
                      />
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-dark-600 pt-4">
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-3">
                      <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Name and date of birth on your Aadhaar card must match Step 1 details exactly.
                      </p>
                    </div>
                    <UploadBox
                      label="Aadhaar Card"
                      accept="image/jpeg,image/png,image/jpg"
                      file={form.aadhaarCard}
                      hint="JPG / PNG image only • Max 500KB • Front side (no PDF)"
                      required
                      onChange={e => set('aadhaarCard', e.target.files[0])}
                    />
                    {form.aadhaarCard && form.aadhaarCard.type?.startsWith('image/') && (
                      <div className="flex justify-center mt-3">
                        <img
                          src={URL.createObjectURL(form.aadhaarCard)}
                          alt="Aadhaar preview"
                          className="w-56 h-32 object-cover rounded-xl border-2 border-primary-500 shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── STEP 6: Qualifications ── */}
              {step === 6 && (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      All educational documents are <strong>optional</strong>. You can skip and upload them later from your profile.
                    </p>
                  </div>

                  <Field label="Qualification Type" hint="Optional — select if you want to upload documents">
                    <SelectInput value={form.educationType} onChange={e => set('educationType', e.target.value)}>
                      <option value="">Select qualification (optional)</option>
                      <option value="degree">Degree / BE / B.Tech / Any Graduate</option>
                      <option value="diploma">Diploma</option>
                    </SelectInput>
                  </Field>

                  {/* Degree */}
                  {form.educationType === 'degree' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Degree Documents — All Optional</p>
                      <UploadBox label="10th Marks Card (Optional)" accept=".pdf,image/*" file={form.marks10th}
                        hint="SSLC / 10th marksheet • Max 500KB" onChange={e => set('marks10th', e.target.files[0])} />
                      <UploadBox label="12th Marks Card (Optional)" accept=".pdf,image/*" file={form.marks12th}
                        hint="PUC / 12th marksheet • Max 500KB" onChange={e => set('marks12th', e.target.files[0])} />
                      <UploadBox label="Degree Certificate (Optional)" accept=".pdf,image/*" file={form.degreeCertificate}
                        hint="Final degree / provisional certificate" onChange={e => set('degreeCertificate', e.target.files[0])} />
                    </div>
                  )}

                  {/* Diploma */}
                  {form.educationType === 'diploma' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Diploma Documents — All Optional</p>
                      <UploadBox label="10th Marks Card (Optional)" accept=".pdf,image/*" file={form.marks10th}
                        hint="SSLC / 10th marksheet • Max 500KB" onChange={e => set('marks10th', e.target.files[0])} />
                      <UploadBox label="Diploma Marks Sheet (Optional)" accept=".pdf,image/*" file={form.diplomaMarksheet}
                        hint="Diploma consolidated marksheet" onChange={e => set('diplomaMarksheet', e.target.files[0])} />
                      <UploadBox label="Diploma Certificate (Optional)" accept=".pdf,image/*" file={form.diplomaCertificate}
                        hint="Diploma completion certificate" onChange={e => set('diplomaCertificate', e.target.files[0])} />
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 7: Experience ── */}
              {step === 7 && (
                <>
                  <Field label="Experience Status" required>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { val: 'no',  label: 'Fresher',    sub: 'No prior work experience' },
                        { val: 'yes', label: 'Experienced', sub: 'Have prior work experience' },
                      ].map(opt => (
                        <button key={opt.val} type="button"
                          onClick={() => set('hasExperience', opt.val)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            form.hasExperience === opt.val
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                          }`}>
                          <p className={`font-semibold text-sm ${form.hasExperience === opt.val ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </Field>

                  {form.hasExperience === 'no' && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">Fresher — No documents needed</p>
                        <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">
                          Click Next to proceed to Bank Details.
                        </p>
                      </div>
                    </div>
                  )}

                  {form.hasExperience === 'yes' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Both documents are <strong>optional</strong>. You can skip and upload them later from your profile.
                        </p>
                      </div>
                      <UploadBox label="Experience Letter (Optional)" accept=".pdf,image/*"
                        file={form.experienceLetter}
                        hint="From previous employer • Max 500KB"
                        onChange={e => set('experienceLetter', e.target.files[0])} />
                      <UploadBox label="Relieving Letter (Optional)" accept=".pdf,image/*"
                        file={form.relievingLetter}
                        hint="Relieving / resignation acceptance letter • Max 500KB"
                        onChange={e => set('relievingLetter', e.target.files[0])} />
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 8: Bank Account Details ── */}
              {step === 8 && (
                <>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-1">
                    <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Bank details are used for salary processing. Please enter your personal bank account details.
                    </p>
                  </div>

                  <Field label="Account Holder Name" required hint="As it appears in your bank passbook">
                    <TextInput
                      value={form.bankAccountName}
                      onChange={e => set('bankAccountName', e.target.value)}
                      placeholder="e.g. Ruthish S"
                    />
                  </Field>

                  <Field label="Account Number" required hint="Your savings/current account number">
                    <TextInput
                      value={form.bankAccountNumber}
                      onChange={e => set('bankAccountNumber', e.target.value.replace(/\D/g,''))}
                      placeholder="Enter account number"
                      maxLength={20}
                    />
                  </Field>

                  <Field label="IFSC Code" required hint="11-character code on your cheque book">
                    <TextInput
                      value={form.bankIfscCode}
                      onChange={e => set('bankIfscCode', e.target.value.toUpperCase().slice(0,11))}
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                      className="font-mono"
                    />
                  </Field>

                  <Field label="Branch Name" required hint="Name of your bank branch">
                    <TextInput
                      value={form.bankBranch}
                      onChange={e => set('bankBranch', e.target.value)}
                      placeholder="e.g. MG Road, Bangalore"
                    />
                  </Field>
                </>
              )}

              {/* ── STEP 9: Review & Submit ── */}
              {step === 9 && (
                <>
                  <div className="space-y-2">
                    {[
                      { label: 'Full Name',      value: form.fullName },
                      { label: 'Date of Birth',  value: form.dob },
                      { label: 'Gender',         value: form.gender },
                      { label: 'Company ID',     value: form.companyId },
                      { label: 'Department',     value: form.department },
                      { label: 'Designation',    value: form.designation },
                      { label: 'Contact',        value: form.contactNumber },
                      { label: 'Alternate',      value: form.alternateNumber || '—' },
                      { label: 'City / State',   value: `${form.city}, ${form.state}` },
                      { label: 'PIN Code',       value: form.pincode },
                      { label: 'Qualification',  value: eduLabel[form.educationType] || form.educationType },
                      { label: 'Experience',     value: form.hasExperience === 'yes' ? 'Experienced' : 'Fresher' },
                      { label: '─── Bank Details ───', value: '' },
                      { label: 'Account Name',   value: form.bankAccountName },
                      { label: 'Account Number', value: form.bankAccountNumber
                          ? `${'•'.repeat(form.bankAccountNumber.length - 4)}${form.bankAccountNumber.slice(-4)}`
                          : '—'
                      },
                      { label: 'IFSC Code',      value: form.bankIfscCode },
                      { label: 'Branch',         value: form.bankBranch },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-dark-600">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 capitalize">{value || '—'}</span>
                      </div>
                    ))}
                  </div>

                  {/* Documents uploaded summary */}
                  <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-dark-700 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents Uploaded</p>
                    {[
                      ['Stamp Size Photo',   form.photo],
                      ['Aadhaar Card',       form.aadhaarCard],
                      ['10th Marks Card',    form.marks10th],
                      ['12th Marks Card',    form.marks12th],
                      ['Degree Marksheet',   form.degreeMarksheet],
                      ['Degree Certificate', form.degreeCertificate],
                      ['Diploma Marksheet',  form.diplomaMarksheet],
                      ['Diploma Certificate',form.diplomaCertificate],
                      ['Experience Letter',  form.experienceLetter],
                      ['Relieving Letter',   form.relievingLetter],
                    ].filter(([, f]) => f).map(([lbl, f]) => (
                      <div key={lbl} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                        <span>{lbl}</span>
                        <span className="text-gray-400 truncate ml-auto max-w-[160px]">{f.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 mt-2">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-600 dark:text-green-400">
                      By submitting, you confirm all information and documents are accurate. They will be reviewed by HR.
                    </p>
                  </div>
                </>
              )}

            </div>

            {/* Navigation */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-600 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>

              {step < STEPS.length ? (
                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 shadow-lg shadow-primary-500/25"
                >
                  Next <ChevronRight size={16} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-teal-600 shadow-lg shadow-green-500/25 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Submitting…
                    </>
                  ) : (
                    <><CheckCircle size={16} /> Submit Documents</>
                  )}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Sign out */}
        <p className="text-center mt-4 text-xs text-gray-400">
          Wrong account?{' '}
          <button onClick={() => { logout(); navigate('/login') }} className="text-primary-500 hover:underline">
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}

export default VerifyDocuments
