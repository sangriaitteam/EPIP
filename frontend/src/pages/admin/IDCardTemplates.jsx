import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit2, Trash2, X, Check, Eye, IdCard,
  Palette, Layout, ToggleLeft, ToggleRight, AlertTriangle, Upload
} from 'lucide-react'
import { api } from '../../services/api'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import Button from '../../components/common/Button'
import toast from 'react-hot-toast'
import sangriaLogo from '../../assets/sangria.png'
import html2canvas from 'html2canvas'

// ── Default design config ─────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  bgColor:         '#0f172a',
  bgGradient:      '135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%',
  accentColor:     '#6366f1',
  accentColor2:    '#cc0000',
  textColor:       '#ffffff',
  mutedColor:      'rgba(255,255,255,0.5)',
  layout:          'horizontal',
  showLogo:        true,
  showQR:          true,
  showDepartment:  true,
  showPhone:       false,
  cardWidth:       340,
  cardHeight:      210,
}

// ── ID Card Preview Component ─────────────────────────────────────────────────
export const IDCardPreview = ({ config = DEFAULT_CONFIG, cardData = {}, cardRef }) => {
  const c = { ...DEFAULT_CONFIG, ...config }
  const name        = cardData.name        || 'Employee Name'
  const designation = cardData.designation || 'Designation'
  const empId       = cardData.empId       || 'EMP0000'
  const department  = cardData.department  || 'Department'
  const photo       = cardData.photo       || null
  const initials    = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div
      ref={cardRef}
      style={{
        width: `${c.cardWidth}px`,
        height: `${c.cardHeight}px`,
        background: `linear-gradient(${c.bgGradient})`,
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Background radial glows */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 80% 20%, ${c.accentColor}22 0%, transparent 50%),
                     radial-gradient(circle at 20% 80%, ${c.accentColor}15 0%, transparent 50%)`,
      }} />

      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
        background: `linear-gradient(90deg, ${c.accentColor}, ${c.accentColor2})`,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px 0' }}>
        {c.showLogo && (
          <img src={sangriaLogo} alt="Logo" width="26" height="26"
            style={{ objectFit: 'contain', flexShrink: 0 }}
            crossOrigin="anonymous"
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ color: c.textColor, fontWeight: 700, fontSize: '10px', lineHeight: 1.2 }}>
            Sangria Edutainment
          </div>
          <div style={{ color: c.mutedColor, fontSize: '7.5px' }}>Pvt Ltd · Employee ID</div>
        </div>
        <div style={{
          background: `${c.accentColor}33`,
          border: `1px solid ${c.accentColor}66`,
          borderRadius: '6px', padding: '2px 8px',
        }}>
          <span style={{ color: c.accentColor, fontSize: '7.5px', fontWeight: 600 }}>EMPLOYEE</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: '10px', padding: '8px 16px' }}>
        {/* Photo + QR */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{
            width: '60px', height: '68px', borderRadius: '10px', overflow: 'hidden',
            border: `2px solid ${c.accentColor}99`,
            background: `linear-gradient(135deg, ${c.accentColor}, ${c.accentColor2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {photo ? (
              <img src={photo} alt="Photo" crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'white', fontSize: '20px', fontWeight: 700 }}>{initials}</span>
            )}
          </div>
          {c.showQR && (
            <div style={{ background: 'white', borderRadius: '5px', padding: '2px', width: '60px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=${encodeURIComponent(`EPIP:${empId}:${name}`)}&bgcolor=ffffff&color=1a1a2e&margin=1`}
                alt="QR" width="56" height="56"
                crossOrigin="anonymous"
                style={{ display: 'block' }}
              />
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: c.textColor, fontWeight: 700, fontSize: '14px', lineHeight: 1.2, marginBottom: '2px' }}>
            {name}
          </div>
          <div style={{ color: c.accentColor, fontSize: '9.5px', fontWeight: 600, marginBottom: '7px' }}>
            {designation}
          </div>
          {[
            { label: 'ID',   value: empId },
            c.showDepartment && { label: 'Dept', value: department },
          ].filter(Boolean).map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: '5px', marginBottom: '3px' }}>
              <span style={{ color: c.mutedColor, fontSize: '7.5px', width: '26px', flexShrink: 0 }}>{label}</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '8.5px', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(255,255,255,0.04)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '4px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '6.5px' }}>sangria-edutainment.com</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '6.5px' }}>
          © {new Date().getFullYear()} Sangria Edutainment Pvt Ltd
        </span>
      </div>
    </div>
  )
}

// ── Color Picker Row ──────────────────────────────────────────────────────────
const ColorRow = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200 dark:border-dark-600" />
      <span className="text-xs font-mono text-gray-500">{value}</span>
    </div>
  </div>
)

// ── Toggle Row ────────────────────────────────────────────────────────────────
const ToggleRow = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
    <button onClick={() => onChange(!value)} className="text-primary-500">
      {value ? <ToggleRight size={22} /> : <ToggleLeft size={22} className="text-gray-400" />}
    </button>
  </div>
)

// ── Main Page ─────────────────────────────────────────────────────────────────
const IDCardTemplates = () => {
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editTpl,   setEditTpl]   = useState(null)
  const [deleteT,   setDeleteT]   = useState(null)
  const [deleting,  setDeleting]  = useState(false)
  const [saving,    setSaving]    = useState(false)

  const [form, setForm] = useState({ name: '', description: '', design_config: DEFAULT_CONFIG })
  const setC = (k, v) => setForm(f => ({ ...f, design_config: { ...f.design_config, [k]: v } }))
  const [formMode,     setFormMode]     = useState('upload') // 'upload' | 'design'
  const [uploadFile,   setUploadFile]   = useState(null)
  const [uploadPreview,setUploadPreview]= useState(null)
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const res = await api.get('/id-cards/templates/all')
      if (res.success) setTemplates(res.data)
    } catch {}
    setLoading(false)
  }

  const openCreate = () => {
    setEditTpl(null)
    setForm({ name: '', description: '', design_config: DEFAULT_CONFIG })
    setFormMode('upload')
    setUploadFile(null)
    setUploadPreview(null)
    setShowForm(true)
  }

  const openEdit = (t) => {
    setEditTpl(t)
    setForm({
      name: t.name,
      description: t.description || '',
      design_config: { ...DEFAULT_CONFIG, ...t.design_config },
    })
    setFormMode(t.design_config?.template_image_url ? 'upload' : 'design')
    setUploadFile(null)
    setUploadPreview(t.design_config?.template_image_url || null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Template name required'); return }

    // Upload mode — need image
    if (formMode === 'upload' && !uploadFile && !uploadPreview) {
      toast.error('Please upload a template image'); return
    }

    setSaving(true)
    try {
      let finalConfig = { ...form.design_config }

      // Store template image as base64 directly in design_config
      if (formMode === 'upload' && uploadFile) {
        const reader = new FileReader()
        const base64 = await new Promise(resolve => {
          reader.onload = e => resolve(e.target.result)
          reader.readAsDataURL(uploadFile)
        })
        finalConfig = { ...finalConfig, template_image_url: base64, template_mode: 'image' }
      } else if (formMode === 'upload' && uploadPreview) {
        finalConfig = { ...finalConfig, template_image_url: uploadPreview, template_mode: 'image' }
      } else {
        finalConfig = { ...finalConfig, template_mode: 'design' }
      }

      const payload = { ...form, design_config: finalConfig }
      const res = editTpl
        ? await api.put(`/id-cards/templates/${editTpl.id}`, { ...payload, is_active: editTpl.is_active })
        : await api.post('/id-cards/templates', payload)
      if (res.success) {
        toast.success(editTpl ? 'Template updated!' : 'Template created!')
        setShowForm(false)
        loadTemplates()
      } else toast.error(res.message)
    } catch { toast.error('Server error') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteT) return
    setDeleting(true)
    try {
      const res = await api.delete(`/id-cards/templates/${deleteT.id}`)
      if (res.success) {
        toast.success('Template deleted')
        setDeleteT(null)
        loadTemplates()
      }
    } catch { toast.error('Server error') }
    setDeleting(false)
  }

  const handleToggleActive = async (t) => {
    try {
      await api.put(`/id-cards/templates/${t.id}`, {
        name: t.name, description: t.description,
        design_config: t.design_config, is_active: !t.is_active,
      })
      loadTemplates()
    } catch {}
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">ID Card Templates</h1>
          <p className="text-xs text-gray-500 mt-0.5">{templates.length} template{templates.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-md shadow-primary-500/25">
          <Plus size={15} /> New Template
        </button>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <IdCard size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-500">No templates yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-md overflow-hidden">
              {/* Preview */}
              <div className="flex justify-center p-4 bg-gray-50 dark:bg-dark-900">
                {t.design_config?.template_mode === 'image' && t.design_config?.template_image_url ? (
                  <img src={t.design_config.template_image_url} alt="Template"
                    className="max-h-40 rounded-xl object-contain shadow-md" />
                ) : (
                  <IDCardPreview config={t.design_config} />
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t.name}</h3>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                  </div>
                  <button onClick={() => handleToggleActive(t)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${t.is_active ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white transition-colors">
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => setDeleteT(t)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Form ── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
                <div className="flex items-center gap-2">
                  <IdCard size={18} className="text-primary-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {editTpl ? 'Edit Template' : 'Create Template'}
                  </h2>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left — Controls */}
                <div className="space-y-5">
                  {/* Basic info */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Template Name *</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Sangria Standard"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Optional description"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                  </div>

                  {/* Mode tabs */}
                  <div>
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-dark-700 rounded-xl mb-4">
                      {[
                        { key: 'upload', label: '📁 Upload Template' },
                        { key: 'design', label: '🎨 Design Template' },
                      ].map(tab => (
                        <button key={tab.key} onClick={() => setFormMode(tab.key)}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                            formMode === tab.key
                              ? 'bg-white dark:bg-dark-800 text-primary-600 dark:text-primary-400 shadow-sm'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Upload mode */}
                    {formMode === 'upload' && (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Upload your ready-made ID card template image (JPG/PNG).
                        </p>
                        <label className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                          uploadPreview
                            ? 'border-green-500 bg-green-500/5'
                            : 'border-gray-300 dark:border-dark-500 hover:border-primary-500 hover:bg-primary-500/5'
                        }`}>
                          {uploadPreview ? (
                            <div className="w-full">
                              <img src={uploadPreview} alt="Template preview"
                                className="max-h-48 mx-auto rounded-xl object-contain shadow-md" />
                              <p className="text-xs text-green-600 dark:text-green-400 text-center mt-2 font-semibold">
                                ✅ Template uploaded — click to change
                              </p>
                            </div>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                                <Upload size={22} className="text-primary-500" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload template</p>
                                <p className="text-xs text-gray-400 mt-1">JPG, PNG • Max 2MB</p>
                              </div>
                            </>
                          )}
                          <input type="file" accept="image/jpeg,image/png,image/jpg" className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
                              setUploadFile(file)
                              const reader = new FileReader()
                              reader.onload = ev => setUploadPreview(ev.target.result)
                              reader.readAsDataURL(file)
                            }} />
                        </label>

                        {/* Photo position controls */}
                        {uploadPreview && (
                          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-dark-600">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                              📍 Photo Circle Position
                            </p>
                            <p className="text-xs text-gray-400">Adjust where the employee photo appears on the template</p>
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs text-gray-500">Top position</span>
                                  <span className="text-xs font-mono text-primary-500">{form.design_config.photoTop ?? 37}%</span>
                                </div>
                                <input type="range" min="10" max="80" value={form.design_config.photoTop ?? 37}
                                  onChange={e => setC('photoTop', parseInt(e.target.value))}
                                  className="w-full accent-primary-500" />
                              </div>
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs text-gray-500">Left position</span>
                                  <span className="text-xs font-mono text-primary-500">{form.design_config.photoLeft ?? 50}%</span>
                                </div>
                                <input type="range" min="10" max="90" value={form.design_config.photoLeft ?? 50}
                                  onChange={e => setC('photoLeft', parseInt(e.target.value))}
                                  className="w-full accent-primary-500" />
                              </div>
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs text-gray-500">Circle size</span>
                                  <span className="text-xs font-mono text-primary-500">{form.design_config.photoSize ?? 110}px</span>
                                </div>
                                <input type="range" min="60" max="200" value={form.design_config.photoSize ?? 110}
                                  onChange={e => setC('photoSize', parseInt(e.target.value))}
                                  className="w-full accent-primary-500" />
                              </div>
                              <div>
                                <div className="flex justify-between mb-1">
                                  <span className="text-xs text-gray-500">Details top position</span>
                                  <span className="text-xs font-mono text-primary-500">{form.design_config.detailsTop ?? 60}%</span>
                                </div>
                                <input type="range" min="30" max="90" value={form.design_config.detailsTop ?? 60}
                                  onChange={e => setC('detailsTop', parseInt(e.target.value))}
                                  className="w-full accent-primary-500" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Design mode */}
                    {formMode === 'design' && (
                      <div className="space-y-4">
                        {/* Colors */}
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                            <Palette size={13} /> Colors
                          </p>
                          <div className="space-y-2.5">
                            <ColorRow label="Background" value={form.design_config.bgColor}
                              onChange={v => { setC('bgColor', v); setC('bgGradient', `135deg, ${v} 0%, #1e1b4b 50%, ${v} 100%`) }} />
                            <ColorRow label="Accent Color" value={form.design_config.accentColor} onChange={v => setC('accentColor', v)} />
                            <ColorRow label="Accent Color 2" value={form.design_config.accentColor2} onChange={v => setC('accentColor2', v)} />
                            <ColorRow label="Text Color" value={form.design_config.textColor} onChange={v => setC('textColor', v)} />
                          </div>
                        </div>
                        {/* Toggles */}
                        <div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                            <Layout size={13} /> Fields
                          </p>
                          <div className="space-y-2.5">
                            <ToggleRow label="Show Logo" value={form.design_config.showLogo} onChange={v => setC('showLogo', v)} />
                            <ToggleRow label="Show QR Code" value={form.design_config.showQR} onChange={v => setC('showQR', v)} />
                            <ToggleRow label="Show Department" value={form.design_config.showDepartment} onChange={v => setC('showDepartment', v)} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right — Preview */}
                <div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                    <Eye size={13} /> Preview
                  </p>
                  {formMode === 'upload' && uploadPreview ? (
                    <div className="p-4 bg-gray-100 dark:bg-dark-900 rounded-2xl flex items-center justify-center overflow-auto min-h-[300px]">
                      <div style={{ position: 'relative', width: '280px', borderRadius: '10px', overflow: 'hidden', margin: '0 auto' }}>
                        <img src={uploadPreview} alt="Template" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        <div style={{
                          position: 'absolute',
                          top: `${form.design_config.photoTop ?? 37}%`,
                          left: `${form.design_config.photoLeft ?? 50}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${Math.round((form.design_config.photoSize ?? 110) * 0.82)}px`,
                          height: `${Math.round((form.design_config.photoSize ?? 110) * 0.82)}px`,
                          borderRadius: '50%',
                          border: '2px solid white',
                          background: 'rgba(99,102,241,0.8)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        }}>
                          <span style={{ color: 'white', fontSize: '10px', fontWeight: 700 }}>PHOTO</span>
                        </div>
                        <div style={{
                          position: 'absolute',
                          top: `${form.design_config.detailsTop ?? 60}%`,
                          left: 0, right: 0,
                          textAlign: 'center',
                          padding: '0 8px',
                        }}>
                          <p style={{ color: '#111', fontWeight: 700, fontSize: '10px', margin: 0 }}>Employee Name</p>
                          <p style={{ color: '#333', fontSize: '8px', margin: '2px 0 0' }}>Designation</p>
                        </div>
                      </div>
                    </div>
                  ) : formMode === 'design' ? (
                    <div className="flex justify-center p-4 bg-gray-100 dark:bg-dark-900 rounded-2xl overflow-auto">
                      <IDCardPreview config={form.design_config}
                        cardData={{ name: 'Ruthish S', designation: 'Junior Executive', empId: 'EMP0001', department: 'Operations' }} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 bg-gray-50 dark:bg-dark-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
                      <Upload size={28} className="text-gray-300 mb-2" />
                      <p className="text-xs text-gray-400">Upload a template to preview</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 text-center mt-2">
                    {formMode === 'upload' ? 'Your uploaded template image' : 'Preview with sample data'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-all">
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : <Check size={15} />}
                  {saving ? 'Saving...' : editTpl ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      <AnimatePresence>
        {deleteT && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteT(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Template?</h3>
              <p className="text-sm text-gray-500 mb-5">
                "<strong>{deleteT.name}</strong>" will be deleted. Employees who generated cards using this template will lose access.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDeleteT(null)}
                  className="py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default IDCardTemplates
