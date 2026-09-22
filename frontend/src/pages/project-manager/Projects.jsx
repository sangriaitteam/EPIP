// Projects.jsx — Zoho Projects style PM panel
// Tabs: Active Projects | Project Groups | Project Templates | Archived Projects
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, RefreshCw, Search, Plus, Users, Calendar,
  ChevronRight, LayoutGrid, List, Archive, Copy,
  CheckCircle, Clock, TrendingUp, X, Layers,
  BookTemplate, Star, Code, Megaphone, Building
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import { api } from '../../services/api'
import toast from 'react-hot-toast'
import ProjectKanban from './ProjectKanban'

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 14 } } }

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—'

const statusBadge = (s) => {
  const map = {
    planning:    'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400',
    in_progress: 'bg-green-500 text-white',
    review:      'bg-yellow-500 text-white',
    completed:   'bg-blue-500 text-white',
    on_hold:     'bg-orange-400 text-white',
    cancelled:   'bg-red-400 text-white',
  }
  return map[s] || map.planning
}

const statusLabel = (s) => ({
  planning:    'Planning',
  in_progress: 'Active',
  review:      'Review',
  completed:   'Completed',
  on_hold:     'On Hold',
  cancelled:   'Cancelled',
}[s] || s)

// ── Project Templates data ────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'software',
    name: 'Software Development',
    icon: Code,
    color: 'from-indigo-500 to-purple-600',
    category: 'Software/IT',
    desc: 'Agile sprint-based software project with tasks for planning, development, testing, and deployment.',
    tasks: [
      { title: 'Project kickoff meeting', priority: 'high'   },
      { title: 'Requirements gathering',  priority: 'high'   },
      { title: 'System design & architecture', priority: 'high' },
      { title: 'Frontend development',    priority: 'medium' },
      { title: 'Backend development',     priority: 'medium' },
      { title: 'Unit testing',            priority: 'medium' },
      { title: 'Integration testing',     priority: 'medium' },
      { title: 'UAT (User Acceptance)',   priority: 'high'   },
      { title: 'Deployment',              priority: 'high'   },
      { title: 'Post-launch review',      priority: 'low'    },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    icon: Megaphone,
    color: 'from-pink-500 to-rose-600',
    category: 'Marketing/Sales',
    desc: 'End-to-end marketing campaign from strategy to execution and reporting.',
    tasks: [
      { title: 'Define campaign goals',       priority: 'high'   },
      { title: 'Audience research',           priority: 'high'   },
      { title: 'Content strategy',            priority: 'medium' },
      { title: 'Design creatives',            priority: 'medium' },
      { title: 'Social media scheduling',     priority: 'medium' },
      { title: 'Email campaign setup',        priority: 'medium' },
      { title: 'Launch campaign',             priority: 'high'   },
      { title: 'Monitor & optimize',          priority: 'medium' },
      { title: 'Campaign report',             priority: 'low'    },
    ],
  },
  {
    id: 'construction',
    name: 'Construction Project',
    icon: Building,
    color: 'from-amber-500 to-orange-600',
    category: 'Construction',
    desc: 'Structured construction project with phases from planning to handover.',
    tasks: [
      { title: 'Site survey & analysis',     priority: 'high'   },
      { title: 'Architectural drawings',     priority: 'high'   },
      { title: 'Permits & approvals',        priority: 'high'   },
      { title: 'Foundation work',            priority: 'high'   },
      { title: 'Structural framing',         priority: 'high'   },
      { title: 'Electrical & plumbing',      priority: 'medium' },
      { title: 'Interior finishing',         priority: 'medium' },
      { title: 'Quality inspection',         priority: 'high'   },
      { title: 'Handover & documentation',   priority: 'medium' },
    ],
  },
  {
    id: 'product_launch',
    name: 'Product Launch',
    icon: Star,
    color: 'from-green-500 to-teal-600',
    category: 'Others',
    desc: 'Complete product launch checklist from ideation to go-live.',
    tasks: [
      { title: 'Market research',            priority: 'high'   },
      { title: 'Product specification',      priority: 'high'   },
      { title: 'Prototype / MVP',            priority: 'high'   },
      { title: 'Beta testing',               priority: 'medium' },
      { title: 'Pricing strategy',           priority: 'medium' },
      { title: 'Sales deck preparation',     priority: 'medium' },
      { title: 'Press release / PR',         priority: 'medium' },
      { title: 'Launch event',               priority: 'high'   },
      { title: 'Post-launch analytics',      priority: 'low'    },
    ],
  },
]

// ── Create Blank Project Modal ────────────────────────────────────────────────
const CreateProjectModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name:        '',
    description: '',
    start_date:  new Date().toISOString().split('T')[0],
    deadline:    '',
    status:      'planning',
  })
  const [employees,   setEmployees]   = useState([])
  const [empSearch,   setEmpSearch]   = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [saving,      setSaving]      = useState(false)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load employees on mount
  useEffect(() => {
    api.get('/employees?limit=200').then(res => {
      if (res.success) setEmployees(res.data || [])
    }).catch(() => {})
  }, [])

  const empName = (e) => e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim()

  const filteredEmps = employees.filter(e =>
    empName(e).toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.designation || '').toLowerCase().includes(empSearch.toLowerCase())
  )

  const toggleEmp = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectedEmps = employees.filter(e => selectedIds.includes(e.id))

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return }
    setSaving(true)
    try {
      const res = await api.post('/projects', {
        ...form,
        name:            form.name.trim(),
        description:     form.description || null,
        start_date:      form.start_date  || null,
        deadline:        form.deadline    || null,
        team_member_ids: selectedIds,
        status:          'planning',
      })
      if (!res.success) { toast.error(res.message || 'Failed to create project'); setSaving(false); return }
      toast.success(`Project "${form.name}" created! ✅`)
      onCreated(res.data)
      onClose()
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
    bg-white dark:bg-dark-700 text-gray-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

  const STATUS_OPTIONS = [
    { value: 'planning',    label: 'Planning',     color: 'border-gray-300 text-gray-600 dark:text-gray-400' },
    { value: 'in_progress', label: 'Active',       color: 'border-green-400 text-green-600' },
    { value: 'review',      label: 'Review',       color: 'border-yellow-400 text-yellow-600' },
    { value: 'on_hold',     label: 'On Hold',      color: 'border-orange-400 text-orange-600' },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-dark-500" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-dark-600 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Create New Project</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details and assign your team</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => setF('name', e.target.value)}
              placeholder="e.g. Website Redesign Q3 2026"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setF('description', e.target.value)}
              placeholder="Briefly describe the project goals, scope, and deliverables…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Start Date + End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Start Date
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setF('start_date', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                End Date / Deadline
              </label>
              <input
                type="date"
                value={form.deadline}
                min={form.start_date}
                onChange={e => setF('deadline', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Initial Status
            </label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setF('status', s.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.status === s.value
                      ? `${s.color} bg-current/10`
                      : 'border-gray-200 dark:border-dark-600 text-gray-400 hover:border-gray-300'
                  }`}
                  style={form.status === s.value ? { background: 'transparent' } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Assign Employees ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Assign Team Members
              {selectedIds.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500 text-white text-[10px] font-bold">
                  {selectedIds.length} selected
                </span>
              )}
            </label>

            {/* Selected team display */}
            {selectedEmps.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-xl bg-primary-500/5 border border-primary-500/20">
                {selectedEmps.map(e => (
                  <motion.div
                    key={e.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-dark-700 border border-primary-500/30 shadow-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                      {empName(e).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 max-w-[80px] truncate">
                      {empName(e).split(' ')[0]}
                    </span>
                    <button
                      onClick={() => toggleEmp(e.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </motion.div>
                ))}
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs text-red-400 hover:text-red-600 font-medium px-1"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Search + Employee list */}
            <div className="border border-gray-200 dark:border-dark-600 rounded-xl overflow-hidden">
              {/* Search bar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  placeholder="Search employee name or designation…"
                  className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                />
                {empSearch && (
                  <button onClick={() => setEmpSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Employee list */}
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700">
                {employees.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    <Users size={20} className="mx-auto mb-2 text-gray-300" />
                    Loading employees…
                  </div>
                ) : filteredEmps.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">No employees found</div>
                ) : (
                  filteredEmps.map(emp => {
                    const isSelected = selectedIds.includes(emp.id)
                    const name = empName(emp)
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmp(emp.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left ${
                          isSelected ? 'bg-primary-500/5' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          isSelected ? 'bg-primary-500' : 'bg-gray-400 dark:bg-dark-500'
                        }`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {emp.designation || emp.department_name || '—'}
                          </p>
                        </div>
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-gray-300 dark:border-dark-500'
                        }`}>
                          {isSelected && (
                            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }}
                              width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </motion.svg>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer count */}
              {filteredEmps.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600 text-[10px] text-gray-400">
                  {selectedIds.length} of {employees.length} selected · {filteredEmps.length} shown
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3 flex-shrink-0 bg-white dark:bg-dark-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            onClick={handleCreate}
            disabled={saving || !form.name.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 shadow-md shadow-primary-500/20 transition-all"
          >
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <><Plus size={15} /> Create Project</>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Use Template modal ────────────────────────────────────────────────────────
const UseTemplateModal = ({ template, onClose, onCreated }) => {
  const [name,      setName]      = useState(`${template.name} — ${new Date().toLocaleDateString('en-IN',{month:'short',year:'numeric'})}`)
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [deadline,  setDeadline]  = useState('')
  const [saving,    setSaving]    = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Project name is required'); return }
    setSaving(true)
    try {
      // 1. Create project
      const projRes = await api.post('/projects', {
        name: name.trim(),
        description: template.desc,
        start_date:  startDate || null,
        deadline:    deadline  || null,
        status:      'planning',
        type:        'pre-production',
      })
      if (!projRes.success) { toast.error(projRes.message || 'Failed to create project'); setSaving(false); return }

      const project = projRes.data
      // 2. Create template tasks for this project (best effort)
      for (const t of template.tasks) {
        await api.post('/tasks', {
          title:        t.title,
          priority:     t.priority,
          project_id:   project.id,
          project_name: project.name,
          assigned_to:  null,
          source:       'project_manager',
        }).catch(() => {})
      }

      toast.success(`Project "${name}" created with ${template.tasks.length} tasks! ✅`)
      onCreated(project)
      onClose()
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
    bg-white dark:bg-dark-700 text-gray-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-md p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0`}>
            <template.icon size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Use Template</h2>
            <p className="text-xs text-gray-400">{template.name} · {template.tasks.length} tasks</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Project Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Task preview */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">Tasks included ({template.tasks.length})</p>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {template.tasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 py-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  {t.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700">
            Cancel
          </button>
          <motion.button onClick={handleCreate} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <><Plus size={14} /> Create Project</>
            }
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Tab: Active Projects ──────────────────────────────────────────────────────
const ActiveProjectsTab = ({ projects, loading, onOpenKanban }) => {
  const [search, setSearch] = useState('')
  const filtered = projects.filter(p =>
    p.status !== 'completed' && p.status !== 'cancelled' &&
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} projects</span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <FolderOpen size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No active projects</p>
          </div>
        ) : (
          <>
            {/* Mobile cards — shown below sm */}
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-dark-700">
              {filtered.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onOpenKanban(p)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderOpen size={13} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                      <span className="text-xs text-gray-400">{p.task_count || 0} tasks</span>
                      {(p.deadline || p.end_date) && (
                        <span className={`text-xs ${new Date(p.deadline || p.end_date) < new Date() ? 'text-red-500' : 'text-gray-400'}`}>
                          Due {fmtDate(p.deadline || p.end_date)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${p.completion_percent || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 font-medium flex-shrink-0">{p.completion_percent || 0}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="px-4 py-2.5 text-xs text-gray-400">
                {filtered.length} projects · Tap to open Kanban
              </div>
            </div>

            {/* Desktop table — hidden on mobile */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 760 }}>
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-700 border-b border-gray-100 dark:border-dark-600">
                  {['ID','Project Name','%','Owner','Status','Tasks','Members','Start Date','End Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {filtered.map((p, i) => (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onOpenKanban(p)}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">
                      {String(p.id).padStart(4, '0')}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                          <FolderOpen size={11} className="text-primary-500" />
                        </div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate max-w-[140px]">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${p.completion_percent || 0}%` }} />
                        </div>
                        <span className="text-gray-500 font-medium">{p.completion_percent || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Avatar name={p.created_by_name || 'Unknown'} size="xs" />
                        <span className="text-gray-600 dark:text-gray-400 truncate max-w-[80px]">{p.created_by_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${statusBadge(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <CheckCircle size={11} className="text-green-500" />
                        <span>{p.done_count || 0}</span>
                        <span className="text-gray-300">/</span>
                        <span>{p.task_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex -space-x-1.5">
                        {(p.members || []).slice(0, 4).map((m, mi) => (
                          <Avatar key={mi} name={`${m.first_name} ${m.last_name}`} src={m.avatar_url} size="xs"
                            className="ring-2 ring-white dark:ring-dark-800" />
                        ))}
                        {(p.members || []).length > 4 && (
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-[9px] font-bold text-gray-500 ring-2 ring-white dark:ring-dark-800">
                            +{p.members.length - 4}
                          </div>
                        )}
                        {!(p.members?.length) && <span className="text-gray-400 text-[10px]">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.start_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.deadline || p.end_date ? (
                        <span className={`${
                          new Date(p.deadline || p.end_date) < new Date() ? 'text-red-500 font-semibold' : 'text-gray-500'
                        }`}>
                          {fmtDate(p.deadline || p.end_date)}
                        </span>
                      ) : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600 text-xs text-gray-400">
              Total Count: {filtered.length} · Click a row to open Kanban board
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Tab: Project Groups ───────────────────────────────────────────────────────
const ProjectGroupsTab = ({ projects, loading, onOpenKanban }) => {
  // Group by type
  const groups = projects.reduce((acc, p) => {
    const key = p.type || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  if (!Object.keys(groups).length) {
    groups['Ungrouped Projects'] = projects
  }

  const groupColors = {
    'pre-production': 'from-purple-500 to-indigo-600',
    'production':     'from-green-500 to-teal-600',
    'post-production':'from-orange-500 to-red-600',
    'Other':          'from-gray-400 to-gray-600',
    'Ungrouped Projects': 'from-blue-500 to-cyan-600',
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groups).map(([groupName, items]) => (
            <motion.div key={groupName}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Group header */}
              <div className={`h-2 bg-gradient-to-r ${groupColors[groupName] || 'from-primary-500 to-purple-600'}`} />
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${groupColors[groupName] || 'from-primary-500 to-purple-600'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {groupName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm capitalize">
                      {groupName.replace('-', ' ')}
                    </h3>
                    <p className="text-xs text-gray-400">{items.length} project{items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Member avatars across all projects */}
                <div className="flex -space-x-1.5 mb-3">
                  {[...new Set(
                    items.flatMap(p => (p.members || []).map(m => `${m.first_name} ${m.last_name}`))
                  )].slice(0, 6).map((name, i) => (
                    <Avatar key={i} name={name} size="xs" className="ring-2 ring-white dark:ring-dark-800" />
                  ))}
                  {items.reduce((s, p) => s + (p.members?.length || 0), 0) > 6 && (
                    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-[9px] font-bold text-gray-500 ring-2 ring-white dark:ring-dark-800">
                      +{items.reduce((s, p) => s + (p.members?.length || 0), 0) - 6}
                    </div>
                  )}
                  {items.every(p => !p.members?.length) && (
                    <span className="text-xs text-gray-400">No members</span>
                  )}
                </div>

                {/* Project list */}
                <div className="space-y-1.5">
                  {items.slice(0, 4).map(p => (
                    <button key={p.id} onClick={() => onOpenKanban(p)}
                      className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left group">
                      <FolderOpen size={12} className="text-primary-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-1">
                        {p.name}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${statusBadge(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </button>
                  ))}
                  {items.length > 4 && (
                    <p className="text-xs text-gray-400 text-center py-1">+{items.length - 4} more projects</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Project Templates ────────────────────────────────────────────────────
const ProjectTemplatesTab = ({ onTemplateUsed }) => {
  const [selected, setSelected] = useState(null)
  const [useModal, setUseModal] = useState(null)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Predefined Project Templates</h3>
        <p className="text-xs text-gray-400">Click a template to preview, then use it to create a new project with pre-loaded tasks.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Blank project card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.02 }}
          onClick={() => onTemplateUsed(null)}
          className="bg-white dark:bg-dark-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600 p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary-400 transition-colors group min-h-[160px]"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center group-hover:bg-primary-500/10 transition-colors">
            <Plus size={22} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Blank Project</p>
            <p className="text-xs text-gray-400 mt-0.5">Start from scratch</p>
          </div>
        </motion.div>

        {/* Template cards */}
        {TEMPLATES.map(t => (
          <motion.div key={t.id}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => setSelected(t)}
            className={`bg-white dark:bg-dark-800 rounded-2xl border-2 cursor-pointer transition-all overflow-hidden min-h-[160px] ${
              selected?.id === t.id
                ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                : 'border-gray-100 dark:border-dark-600 hover:border-primary-300'
            }`}
          >
            {/* Color strip */}
            <div className={`h-1.5 bg-gradient-to-r ${t.color}`} />
            <div className="p-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3`}>
                <t.icon size={18} className="text-white" />
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">{t.name}</p>
              <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">{t.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-dark-700 px-2 py-0.5 rounded-full">
                  {t.category}
                </span>
                <span className="text-[10px] text-gray-400">{t.tasks.length} tasks</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Selected template preview */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden"
          >
            <div className={`h-1.5 bg-gradient-to-r ${selected.color}`} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center`}>
                    <selected.icon size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{selected.name}</h3>
                    <p className="text-xs text-gray-400">{selected.tasks.length} pre-loaded tasks · {selected.category}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSelected(null)}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-dark-600 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-700">
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setUseModal(selected)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r ${selected.color} text-white text-xs font-bold shadow-md`}
                  >
                    <Copy size={12} /> Use Template
                  </motion.button>
                </div>
              </div>

              {/* Task list preview (Kanban columns style) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {['high', 'medium', 'low'].map(pri => {
                  const priTasks = selected.tasks.filter(t => t.priority === pri)
                  if (!priTasks.length) return null
                  const colors = { high: 'border-red-200 bg-red-50 dark:bg-red-900/10', medium: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10', low: 'border-green-200 bg-green-50 dark:bg-green-900/10' }
                  const labels = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }
                  return (
                    <div key={pri} className={`rounded-xl border p-3 ${colors[pri]}`}>
                      <p className="text-xs font-bold mb-2">{labels[pri]}</p>
                      <div className="space-y-1.5">
                        {priTasks.map((t, i) => (
                          <div key={i} className="bg-white dark:bg-dark-800 rounded-lg p-2 text-xs text-gray-700 dark:text-gray-300 shadow-sm">
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Use Template modal */}
      <AnimatePresence>
        {useModal && (
          <UseTemplateModal
            template={useModal}
            onClose={() => setUseModal(null)}
            onCreated={(p) => { onTemplateUsed(p); setSelected(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Template Gallery Modal — "New Project" button se open ────────────────────
const TemplateGalleryModal = ({ onClose, onTemplateUsed, onBlankProject }) => {
  const [selected,  setSelected]  = useState(null)
  const [useModal,  setUseModal]  = useState(null)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">Template Gallery</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose a template or start from scratch</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* New / Blank */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New</p>
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              onClick={() => { onBlankProject(); onClose() }}
              className="inline-flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600 cursor-pointer hover:border-primary-400 hover:bg-primary-500/5 transition-all w-44 min-h-[140px] group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center group-hover:bg-primary-500/10 transition-colors">
                <Plus size={24} className="text-gray-400 group-hover:text-primary-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Project</p>
                <p className="text-xs text-gray-400 mt-0.5">Blank project</p>
              </div>
            </motion.div>
          </div>

          {/* Predefined templates */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Predefined Project Templates</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {TEMPLATES.map(t => (
                <motion.div key={t.id}
                  whileHover={{ y: -3, scale: 1.02 }}
                  onClick={() => setSelected(t)}
                  className={`rounded-2xl border-2 cursor-pointer transition-all overflow-hidden ${
                    selected?.id === t.id
                      ? 'border-primary-500 shadow-lg shadow-primary-500/20'
                      : 'border-gray-100 dark:border-dark-600 hover:border-primary-300'
                  }`}
                >
                  <div className={`h-1.5 bg-gradient-to-r ${t.color}`} />
                  <div className="p-4 bg-white dark:bg-dark-800">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-3`}>
                      <t.icon size={17} className="text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight mb-1">{t.name}</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">{t.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-gray-100 dark:bg-dark-700 text-gray-500 px-2 py-0.5 rounded-full">{t.category}</span>
                      <span className="text-[10px] text-gray-400">{t.tasks.length} tasks</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Selected template preview */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-gray-50 dark:bg-dark-700 rounded-2xl p-5 border border-gray-200 dark:border-dark-600"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selected.color} flex items-center justify-center`}>
                      <selected.icon size={17} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">{selected.name}</h3>
                      <p className="text-xs text-gray-400">{selected.tasks.length} tasks · {selected.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelected(null)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-dark-600 text-xs text-gray-500 hover:bg-white dark:hover:bg-dark-800">
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setUseModal(selected)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r ${selected.color} text-white text-xs font-bold shadow-md`}
                    >
                      <Copy size={12} /> Use Template »
                    </motion.button>
                  </div>
                </div>

                {/* Task preview columns */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['high', 'medium', 'low'].map(pri => {
                    const priTasks = selected.tasks.filter(t => t.priority === pri)
                    if (!priTasks.length) return null
                    const colors = {
                      high:   'border-red-200 bg-red-50 dark:bg-red-900/10',
                      medium: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10',
                      low:    'border-green-200 bg-green-50 dark:bg-green-900/10',
                    }
                    const labels = { high: '🔴 High Priority', medium: '🟡 Medium Priority', low: '🟢 Low Priority' }
                    return (
                      <div key={pri} className={`rounded-xl border p-3 ${colors[pri]}`}>
                        <p className="text-xs font-bold mb-2 text-gray-700 dark:text-gray-300">{labels[pri]}</p>
                        <div className="space-y-1.5">
                          {priTasks.map((t, i) => (
                            <div key={i} className="bg-white dark:bg-dark-800 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-dark-600">
                              {t.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Use Template modal */}
      <AnimatePresence>
        {useModal && (
          <UseTemplateModal
            template={useModal}
            onClose={() => setUseModal(null)}
            onCreated={(p) => { onTemplateUsed(p); setUseModal(null) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Tab: Archived Projects ────────────────────────────────────────────────────
const ArchivedTab = ({ projects, loading, onOpenKanban }) => {
  const archived = projects.filter(p => p.status === 'completed' || p.status === 'cancelled')
  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : archived.length === 0 ? (
        <div className="py-14 text-center">
          <Archive size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No archived projects yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 divide-y divide-gray-50 dark:divide-dark-700 shadow-sm">
          {archived.map((p, i) => (
            <motion.button key={p.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onOpenKanban(p)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left group"
            >
              <Archive size={15} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {p.name}
                </p>
                <p className="text-xs text-gray-400">{fmtDate(p.deadline || p.end_date)}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${statusBadge(p.status)}`}>
                {statusLabel(p.status)}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Projects Page ────────────────────────────────────────────────────────
const TABS = [
  { id: 'active',    label: 'Active Projects',    icon: FolderOpen   },
  { id: 'groups',    label: 'Project Groups',     icon: Layers       },
  { id: 'templates', label: 'Project Templates',  icon: Copy         },
  { id: 'archived',  label: 'Archived Projects',  icon: Archive      },
]

const PMProjects = () => {
  const [tab,              setTab]              = useState('active')
  const [projects,         setProjects]         = useState([])
  const [loading,          setLoading]          = useState(true)
  const [refreshing,       setRefreshing]       = useState(false)
  const [kanban,           setKanban]           = useState(null)
  const [showGallery,      setShowGallery]      = useState(false)
  const [showCreateModal,  setShowCreateModal]  = useState(false)   // ← NEW

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/projects?limit=200')
      if (res.success) {
        const data = res.data?.projects || res.data || []
        setProjects(data)
        // Save recent projects to localStorage
        const recent = data.slice(0, 4).map(p => ({ id: p.id, name: p.name }))
        localStorage.setItem('epip_recent_projects', JSON.stringify(recent))
      }
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [])

  const openKanban = (p) => {
    setKanban(p)
    // Update recent projects
    try {
      const stored = JSON.parse(localStorage.getItem('epip_recent_projects') || '[]')
      const updated = [{ id: p.id, name: p.name }, ...stored.filter(r => r.id !== p.id)].slice(0, 4)
      localStorage.setItem('epip_recent_projects', JSON.stringify(updated))
      window.dispatchEvent(new Event('recent-projects-updated'))
    } catch {}
  }

  const handleTemplateUsed = (newProject) => {
    if (newProject) {
      setProjects(prev => [newProject, ...prev])
      setTab('active')
    } else {
      setTab('active')
    }
    load(true)
  }

  const handleBlankProject = () => {
    setShowGallery(false)
    setShowCreateModal(true)
  }

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [newProject, ...prev])
    setTab('active')
    load(true)
  }

  // ── If Kanban open → show board ───────────────────────────────────────────
  if (kanban) {
    return <ProjectKanban project={kanban} onBack={() => { setKanban(null); load(true) }} />
  }

  return (
    <motion.div initial="hidden" animate="show" className="space-y-4 sm:space-y-5">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {projects.length} total · {projects.filter(p => p.status === 'in_progress').length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 shadow-md shadow-primary-500/25 hover:shadow-lg transition-all"
          >
            <Plus size={14} /> New Project
          </motion.button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp}
        className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              tab === t.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300'
            }`}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
        >
          {tab === 'active'    && <ActiveProjectsTab    projects={projects} loading={loading} onOpenKanban={openKanban} />}
          {tab === 'groups'    && <ProjectGroupsTab     projects={projects} loading={loading} onOpenKanban={openKanban} />}
          {tab === 'templates' && <ProjectTemplatesTab  onTemplateUsed={handleTemplateUsed} />}
          {tab === 'archived'  && <ArchivedTab          projects={projects} loading={loading} onOpenKanban={openKanban} />}
        </motion.div>
      </AnimatePresence>

      {/* Template Gallery Modal — opened from "New Project" button */}
      <AnimatePresence>
        {showGallery && (
          <TemplateGalleryModal
            onClose={() => setShowGallery(false)}
            onTemplateUsed={(p) => { handleTemplateUsed(p); setShowGallery(false) }}
            onBlankProject={handleBlankProject}
          />
        )}
      </AnimatePresence>

      {/* Create Blank Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onCreated={handleProjectCreated}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default PMProjects
