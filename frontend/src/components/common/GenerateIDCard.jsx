import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Upload, Download, IdCard, Check,
  ChevronRight, User, Hash, Briefcase, RefreshCw, FileText
} from 'lucide-react'
import { api } from '../../services/api'
import { IDCardPreview } from '../../pages/admin/IDCardTemplates'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'

const STEPS = ['Select Template', 'Fill Details', 'Generate & Download']

// ── Uploaded-template overlay card (the actual rendered card for download) ──
const TemplateOverlayCard = ({ templateUrl, photo, name, designation, empId, cardRef, config = {} }) => {
  const photoTop    = config.photoTop    ?? 37
  const photoLeft   = config.photoLeft   ?? 50
  const photoSize   = config.photoSize   ?? 110
  const detailsTop  = config.detailsTop  ?? 60

  return (
  <div
    ref={cardRef}
    style={{
      position: 'relative',
      width: '340px',
      height: 'auto',
      borderRadius: '16px',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      flexShrink: 0,
      userSelect: 'none',
      display: 'inline-block',
    }}
  >
    {/* Background template image — drives the height */}
    <img
      src={templateUrl}
      alt="Template"
      crossOrigin="anonymous"
      style={{ width: '340px', height: 'auto', display: 'block' }}
    />

    {/* Employee photo — centered circle */}
    <div style={{
      position: 'absolute',
      top: `${photoTop}%`,
      left: `${photoLeft}%`,
      transform: 'translate(-50%, -50%)',
      width: `${photoSize}px`,
      height: `${photoSize}px`,
      borderRadius: '50%',
      overflow: 'hidden',
      border: '3px solid white',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      background: '#e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {photo ? (
        <img src={photo} alt="Employee" crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ color: 'white', fontSize: '32px', fontWeight: 700 }}>
          {name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'EE'}
        </span>
      )}
    </div>

      {/* Employee details — below photo */}
      <div style={{
        position: 'absolute',
        top: `${detailsTop}%`,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        padding: '0 16px',
      }}>
        {/* Name */}
        <p style={{
          color: '#111111',
          fontWeight: 700,
          fontSize: '16px',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {name || 'Employee Name'}
        </p>

        {/* Designation */}
        <p style={{
          color: '#333333',
          fontWeight: 600,
          fontSize: '12px',
          textAlign: 'center',
          margin: 0,
          letterSpacing: '0.5px',
        }}>
          {designation || 'Designation'}
        </p>

        {/* Emp ID — plain text, no pill background */}
        <p style={{
          color: '#111111',
          fontWeight: 700,
          fontSize: '12px',
          textAlign: 'center',
          margin: '4px 0 0',
          letterSpacing: '1px',
        }}>
          {empId || 'EMP0000'}
        </p>
      </div>
  </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const GenerateIDCard = ({ empData, onClose }) => {
  const [step,        setStep]        = useState(0)
  const [templates,   setTemplates]   = useState([])
  const [selectedTpl, setSelectedTpl] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [generated,   setGenerated]   = useState(null)

  const cardRef = useRef(null)

  const [form, setForm] = useState({
    name:         empData?.name || `${empData?.first_name || ''} ${empData?.last_name || ''}`.trim(),
    designation:  empData?.designation || '',
    empId:        empData?.employee_id || '',
    photoFile:    null,
    photoPreview: empData?.avatar_url || null,
  })

  useEffect(() => {
    api.get('/id-cards/templates')
      .then(r => { if (r.success) setTemplates(r.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, photoFile: file, photoPreview: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const isUploadedTemplate = selectedTpl?.design_config?.template_mode === 'image'
  const templateImageUrl   = selectedTpl?.design_config?.template_image_url

  const handleGenerate = async () => {
    if (!selectedTpl) return
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('template_id',        selectedTpl.id)
      formData.append('custom_name',        form.name)
      formData.append('custom_designation', form.designation)
      formData.append('custom_emp_id',      form.empId)
      if (form.photoFile) formData.append('avatar', form.photoFile)

      const token = localStorage.getItem('epip_token')
      const BASE  = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
      const res   = await fetch(`${BASE}/id-cards/generate`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })
      const data = await res.json()
      if (data.success) {
        setGenerated(data.data)
        setStep(2)
        toast.success('ID Card generated!')
      } else toast.error(data.message || 'Generation failed')
    } catch { toast.error('Server error') }
    setSaving(false)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const tplConfig  = selectedTpl?.design_config || {}
      const photoTop   = tplConfig.photoTop   ?? 37
      const photoLeft  = tplConfig.photoLeft  ?? 50
      const photoSize  = tplConfig.photoSize  ?? 110
      const detailsTop = tplConfig.detailsTop ?? 60

      const CARD_W = 340
      let   CARD_H = 540
      const SCALE  = 3

      // Helper to load image
      const loadImg = (src) => new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload  = () => resolve(img)
        img.onerror = reject
        img.src = src
      })

      // Load template first to get aspect ratio
      let tplImg = null
      if (isUploadedTemplate && templateImageUrl) {
        tplImg = await loadImg(templateImageUrl)
        CARD_H = Math.round(CARD_W * (tplImg.naturalHeight / tplImg.naturalWidth))
      }

      const canvas  = document.createElement('canvas')
      canvas.width  = CARD_W * SCALE
      canvas.height = CARD_H * SCALE
      const ctx     = canvas.getContext('2d')
      ctx.scale(SCALE, SCALE)

      // 1. Draw template background
      if (tplImg) ctx.drawImage(tplImg, 0, 0, CARD_W, CARD_H)

      // 2. Draw employee photo in circle
      const photoX   = (photoLeft / 100) * CARD_W
      const photoY   = (photoTop  / 100) * CARD_H
      const radius   = photoSize / 2
      const photoSrc = form.photoPreview || generated?.photo_url

      if (photoSrc) {
        try {
          const empImg = await loadImg(photoSrc)
          ctx.save()
          ctx.beginPath()
          ctx.arc(photoX, photoY, radius, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(empImg, photoX - radius, photoY - radius, photoSize, photoSize)
          ctx.restore()
        } catch {
          ctx.save()
          ctx.beginPath()
          ctx.arc(photoX, photoY, radius, 0, Math.PI * 2)
          ctx.fillStyle = '#d1d5db'
          ctx.fill()
          ctx.restore()
        }
      }

      // 3. White border ring
      ctx.beginPath()
      ctx.arc(photoX, photoY, radius + 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'white'
      ctx.lineWidth   = 3
      ctx.stroke()

      // 4. Text details (only for uploaded template)
      if (isUploadedTemplate) {
        const detailsY = (detailsTop / 100) * CARD_H
        ctx.textAlign     = 'center'
        ctx.shadowColor   = 'transparent'
        ctx.shadowBlur    = 0

        // Name
        ctx.font      = 'bold 18px Arial'
        ctx.fillStyle = '#111111'
        ctx.fillText(generated?.custom_name || form.name || '', CARD_W / 2, detailsY)

        // Designation
        ctx.font      = '600 13px Arial'
        ctx.fillStyle = '#333333'
        ctx.fillText(generated?.custom_designation || form.designation || '', CARD_W / 2, detailsY + 22)

        // Emp ID
        ctx.font      = 'bold 12px Arial'
        ctx.fillStyle = '#111111'
        ctx.fillText(generated?.custom_emp_id || form.empId || '', CARD_W / 2, detailsY + 42)
      }

      // 5. Download as PNG
      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const url  = URL.createObjectURL(new Blob([blob], { type: 'image/png' }))
          const link = document.createElement('a')
          link.href     = url
          link.download = `EPIP-ID-${form.empId || 'card'}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(url), 2000)
          resolve()
        }, 'image/png', 1.0)
      })
      toast.success('ID Card downloaded! ✅')
    } catch (err) {
      console.error(err)
      toast.error('Download failed: ' + err.message)
    }
    setDownloading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <div className="flex items-center gap-2">
            <IdCard size={18} className="text-primary-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Generate ID Card</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={15} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step  ? 'bg-green-500 text-white' :
                  i === step ? 'bg-primary-500 text-white' :
                  'bg-gray-100 dark:bg-dark-700 text-gray-400'
                }`}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-primary-500' : 'text-gray-400'}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && <ChevronRight size={14} className="text-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">

          {/* ── STEP 0: Select Template ── */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a company ID card template:
              </p>
              {loading ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  No templates available. Contact your admin.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {templates.map(t => {
                    const isImage = t.design_config?.template_mode === 'image'
                    return (
                      <button key={t.id} onClick={() => setSelectedTpl(t)}
                        className={`text-left rounded-2xl border-2 overflow-hidden transition-all ${
                          selectedTpl?.id === t.id
                            ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                            : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                        }`}>
                        <div className="flex justify-center p-3 bg-gray-50 dark:bg-dark-900 min-h-[140px] items-center">
                          {isImage && t.design_config?.template_image_url ? (
                            <img src={t.design_config.template_image_url} alt={t.name}
                              className="max-h-36 rounded-lg object-contain shadow-md" />
                          ) : (
                            <div className="transform scale-75 origin-center">
                              <IDCardPreview config={t.design_config}
                                cardData={{ name: form.name || 'Employee Name', designation: form.designation || 'Employee', empId: form.empId || 'EMP0000' }} />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                            {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                          </div>
                          {selectedTpl?.id === t.id && (
                            <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={() => setStep(1)} disabled={!selectedTpl}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 transition-all">
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: Fill Details ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left — Form */}
                <div className="space-y-4">

                  {/* Photo upload */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Profile Photo {isUploadedTemplate && <span className="text-primary-500">— appears in circle on card</span>}
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-700 flex items-center justify-center flex-shrink-0 border-2 border-dashed border-gray-300 dark:border-dark-500">
                        {form.photoPreview ? (
                          <img src={form.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-gray-300" />
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white transition-colors">
                          <Upload size={12} /> Upload Photo
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                        </label>
                        <p className="text-xs text-gray-400 mt-1">JPG/PNG, max 2MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Your full name"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Designation *</label>
                    <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                      placeholder="e.g. Junior Executive"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>

                  {/* Emp ID */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Employee ID *</label>
                    <input value={form.empId} onChange={e => setForm(f => ({ ...f, empId: e.target.value }))}
                      placeholder="e.g. EMP0001"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>

                {/* Right — Live Preview */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Live Preview</p>
                  <div className="flex justify-center p-3 bg-gray-50 dark:bg-dark-900 rounded-2xl overflow-auto">
                    {isUploadedTemplate && templateImageUrl ? (
                      <TemplateOverlayCard
                        templateUrl={templateImageUrl}
                        photo={form.photoPreview}
                        name={form.name || 'Your Name'}
                        designation={form.designation || 'Designation'}
                        empId={form.empId || 'EMP0000'}
                        config={selectedTpl?.design_config}
                      />
                    ) : (
                      <IDCardPreview
                        config={selectedTpl?.design_config}
                        cardData={{
                          name:        form.name || 'Your Name',
                          designation: form.designation || 'Designation',
                          empId:       form.empId || 'EMP0000',
                          department:  empData?.department_name || '—',
                          photo:       form.photoPreview,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-between pt-2">
                <button onClick={() => setStep(0)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                  ← Back
                </button>
                <button onClick={handleGenerate}
                  disabled={saving || !form.name || !form.designation || !form.empId}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 disabled:opacity-40 transition-all shadow-lg shadow-primary-500/25">
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : <RefreshCw size={15} />}
                  {saving ? 'Generating...' : 'Generate ID Card'}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Download ── */}
          {step === 2 && generated && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <Check size={16} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  ID Card generated successfully!
                </p>
              </div>

              {/* Final card */}
              <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-900 rounded-2xl">
                {isUploadedTemplate && templateImageUrl ? (
                  <TemplateOverlayCard
                    templateUrl={templateImageUrl}
                    photo={form.photoPreview || generated.photo_url}
                    name={generated.custom_name}
                    designation={generated.custom_designation}
                    empId={generated.custom_emp_id}
                    cardRef={cardRef}
                    config={selectedTpl?.design_config}
                  />
                ) : (
                  <IDCardPreview
                    config={selectedTpl?.design_config}
                    cardData={{
                      name:        generated.custom_name,
                      designation: generated.custom_designation,
                      empId:       generated.custom_emp_id,
                      department:  empData?.department_name || '—',
                      photo:       form.photoPreview || generated.photo_url,
                    }}
                    cardRef={cardRef}
                  />
                )}
              </div>

              {/* Download PDF button */}
              <button onClick={handleDownload} disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700 disabled:opacity-60 transition-all shadow-lg shadow-primary-500/25">
                {downloading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : <FileText size={15} />}
                {downloading ? 'Generating...' : 'Download ID Card (PNG)'}
              </button>
              <p className="text-xs text-gray-400 text-center">High resolution PNG • Print ready</p>

              <div className="flex gap-3">
                <button onClick={() => { setStep(0); setGenerated(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                  Generate Another
                </button>
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-800 dark:bg-dark-600 hover:bg-gray-900 transition-colors">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default GenerateIDCard
