// Projects.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, RefreshCw, Search, Plus, Users, Calendar,
  CheckCircle, X, Layers, Trash2, UserPlus,
  ArrowLeft, Flag, FileText, Briefcase, Tag, ChevronDown
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 14 } }
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'

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

// ── Add Member Panel ──────────────────────────────────────────────────────────
const AddMemberPanel = ({ project, onClose, onUpdated }) => {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)
  const currentIds = (project.members || []).map(m => m.id)

  useEffect(() => {
    api.get('/employees?limit=200').then(res => {
      if (res.success) setEmployees(res.data || [])
    }).catch(() => {})
  }, [])

  const empName = (e) => e.name || ((e.first_name || '') + ' ' + (e.last_name || '')).trim()
  const filtered = employees.filter(e =>
    empName(e).toLowerCase().includes(search.toLowerCase()) ||
    (e.designation || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async (emp) => {
    setSaving(emp.id)
    const newIds = [...currentIds, emp.id]
    try {
      const res = await api.put('/projects/' + project.id, { team_member_ids: newIds })
      if (res.success) { toast.success(empName(emp) + ' added'); onUpdated(); onClose() }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect to server') }
    setSaving(null)
  }

  const handleRemove = async (emp) => {
    setSaving(emp.id)
    const newIds = currentIds.filter(id => id !== emp.id)
    try {
      const res = await api.put('/projects/' + project.id, { team_member_ids: newIds })
      if (res.success) { toast.success(empName(emp) + ' removed'); onUpdated(); onClose() }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect to server') }
    setSaving(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute right-0 top-8 z-50 w-64 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
        <p className="text-xs font-semibold text-gray-700 dark:text-white">Manage Members</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-dark-600">
        <Search size={11} className="text-gray-400 flex-shrink-0" />
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employee..."
          className="flex-1 text-xs bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none" />
      </div>
      {currentIds.length > 0 && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Current</p>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {(project.members || []).map(m => {
              const name = ((m.first_name || '') + ' ' + (m.last_name || '')).trim()
              return (
                <div key={m.id} className="flex items-center gap-2 py-1">
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-200 flex-1 truncate">{name}</span>
                  <button onClick={() => handleRemove(m)} disabled={saving === m.id}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
                    <X size={11} />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="border-t border-gray-100 dark:border-dark-600 mt-1.5 pt-1.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Add</p>
          </div>
        </div>
      )}
      <div className="max-h-44 overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700">
        {filtered.filter(e => !currentIds.includes(e.id)).length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {employees.length === 0 ? 'Loading...' : 'No employees to add'}
          </p>
        ) : (
          filtered.filter(e => !currentIds.includes(e.id)).map(emp => (
            <button key={emp.id} onClick={() => handleAdd(emp)} disabled={saving === emp.id}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary-500/5 transition-colors text-left disabled:opacity-50">
              <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-dark-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {empName(emp).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{empName(emp)}</p>
                {emp.designation && <p className="text-[10px] text-gray-400 truncate">{emp.designation}</p>}
              </div>
              <Plus size={12} className="text-primary-500 flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </motion.div>
  )
}

// ── Active Projects Tab ───────────────────────────────────────────────────────
const ActiveProjectsTab = ({ projects, loading, onDeleteProject, onRefresh }) => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [memberPanel, setMemberPanel] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const filtered = projects.filter(p =>
    p.status !== 'completed' && p.status !== 'cancelled' &&
    (p.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (e, p) => {
    e.stopPropagation()
    if (!window.confirm('Delete project "' + p.name + '"? This will also delete all its tasks.')) return
    setDeleting(p.id)
    try {
      const res = await api.delete('/projects/' + p.id)
      if (res.success) { toast.success('"' + p.name + '" deleted'); onDeleteProject(p.id) }
      else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect to server') }
    setDeleting(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} projects</span>
      </div>
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
            <div className="sm:hidden divide-y divide-gray-100 dark:divide-dark-700">
              {filtered.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => navigate('/pm/projects/' + p.id)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderOpen size={13} className="text-primary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: (p.completion_percent || 0) + '%' }} />
                      </div>
                      <span className="text-xs text-gray-500 font-medium flex-shrink-0">{p.completion_percent || 0}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs" style={{ minWidth: 800 }}>
                <thead>
                  <tr className="bg-gray-50 dark:bg-dark-700 border-b border-gray-100 dark:border-dark-600">
                    {['ID', 'Project Name', '%', 'Owner', 'Status', 'Tasks', 'Members', 'Start Date', 'End Date', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate('/pm/projects/' + p.id)}
                      className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">{String(p.id).padStart(4, '0')}</td>
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                            <FolderOpen size={11} className="text-primary-500" />
                          </div>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: (p.completion_percent || 0) + '%' }} />
                          </div>
                          <span className="text-gray-500 font-medium">{p.completion_percent || 0}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={p.created_by_name || 'Unknown'} size="xs" />
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[80px]">{p.created_by_name || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={'px-2.5 py-1 rounded-lg text-[10px] font-bold ' + statusBadge(p.status)}>
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
                      <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 relative">
                          <div className="flex -space-x-1.5">
                            {(p.members || []).slice(0, 3).map((m, mi) => (
                              <Avatar key={mi} name={(m.first_name || '') + ' ' + (m.last_name || '')} src={m.avatar_url} size="xs" className="ring-2 ring-white dark:ring-dark-800" />
                            ))}
                            {(p.members || []).length > 3 && (
                              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-[9px] font-bold text-gray-500 ring-2 ring-white dark:ring-dark-800">
                                +{p.members.length - 3}
                              </div>
                            )}
                          </div>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); setMemberPanel(memberPanel === p.id ? null : p.id) }}
                            className="w-5 h-5 rounded-full bg-primary-500/10 hover:bg-primary-500 text-primary-500 hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                            <UserPlus size={10} />
                          </motion.button>
                          <AnimatePresence>
                            {memberPanel === p.id && (
                              <AddMemberPanel project={p} onClose={() => setMemberPanel(null)}
                                onUpdated={() => { setMemberPanel(null); onRefresh() }} />
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(p.start_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.deadline || p.end_date ? (
                          <span className={new Date(p.deadline || p.end_date) < new Date() ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                            {fmtDate(p.deadline || p.end_date)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                          onClick={e => handleDelete(e, p)} disabled={deleting === p.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50">
                          <Trash2 size={13} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600 text-xs text-gray-400">
                Total Count: {filtered.length}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Create New Project ────────────────────────────────────────────────────────
// ── Project Templates ─────────────────────────────────────────────────────────
// ── 3D Models — 18 chapter tasks (from production content sheet) ──────────────
const TEMPLATE_TASKS = {
  '3d_models': [
    { seq: 0,  title: 'Login Screen',              file_name: '00_Scr', duration_mins: 0,   description: 'Project login screen setup and access configuration.' },
    { seq: 1,  title: 'Intro',                     file_name: '01_Scr', duration_mins: 10,  description: 'Project introduction — overview, objectives and scope. (10 min)' },
    { seq: 2,  title: 'Features',                  file_name: '02_Scr', duration_mins: 5,   description: 'Key features and capabilities walkthrough. (5 min)' },
    { seq: 3,  title: 'System Configuration',      file_name: '03_Scr', duration_mins: 15,  description: 'System configuration requirements and setup steps. (15 min)' },
    { seq: 4,  title: 'Technical Specifications',  file_name: '04_Scr', duration_mins: 15,  description: 'Detailed technical specifications and standards. (15 min)' },
    { seq: 5,  title: 'Software Loading',          file_name: '05_Scr', duration_mins: 30,  description: 'Software installation and loading procedures. (30 min)' },
    { seq: 6,  title: 'Deployment',                file_name: '06_Scr', duration_mins: 45,  description: 'Deployment process and environment setup. (45 min)' },
    { seq: 7,  title: 'Operation',                 file_name: '07_Scr', duration_mins: 120, description: 'Full operational procedures and workflow. (120 min)' },
    { seq: 8,  title: 'Firing',                    file_name: '08_Scr', duration_mins: 20,  description: 'Firing sequence, triggers and execution procedures. (20 min)' },
    { seq: 9,  title: 'Preventive Maintenance',    file_name: '09_Scr', duration_mins: 60,  description: 'Scheduled preventive maintenance tasks and checklist. (60 min)' },
    { seq: 10, title: 'Fault Diagnosis',           file_name: '10_Scr', duration_mins: 80,  description: 'Fault detection, diagnosis and troubleshooting guide. (80 min)' },
    { seq: 11, title: 'Dismantling & Reassembly',  file_name: '11_Scr', duration_mins: 240, description: 'Step-by-step dismantling and reassembly instructions. (240 min)' },
    { seq: 12, title: 'Test Equipment',            file_name: '12_Scr', duration_mins: 60,  description: 'Test equipment usage, calibration and procedures. (60 min)' },
    { seq: 13, title: "Do's and Don'ts",           file_name: '13_Scr', duration_mins: 20,  description: 'Safety guidelines, do\'s and don\'ts for operations. (20 min)' },
    { seq: 14, title: '3D Models',                 file_name: '14_Scr', duration_mins: 0,   description: '3D model creation, rigging, texturing and animation assets.' },
    { seq: 15, title: 'Gallery',                   file_name: '15_Scr', duration_mins: 0,   description: 'Image and media gallery compilation for the project.' },
    { seq: 16, title: 'Manuals',                   file_name: '16_Scr', duration_mins: 0,   description: 'User manuals, reference guides and documentation.' },
    { seq: 17, title: 'Extra',                     file_name: '17_Scr', duration_mins: 0,   description: 'Additional content, appendix and supplementary material.' },
  ],
}

const PROJECT_TEMPLATES = [
  {
    id:          'cbt',
    name:        'CBT',
    fullName:    'Computer Based Training',
    icon:        '🎓',
    color:       'from-blue-500 to-indigo-600',
    description: 'A structured Computer Based Training project for employee skill development and certification.',
    priority:    'medium',
    status:      'planning',
  },
  {
    id:          's1000d',
    name:        'S1000D',
    fullName:    'International Technical Documentation',
    icon:        '📋',
    color:       'from-emerald-500 to-teal-600',
    description: 'Technical documentation project following S1000D specification for aerospace, defence and industrial equipment.',
    priority:    'high',
    status:      'planning',
  },
  {
    id:          'ietm',
    name:        'IETM',
    fullName:    'Interactive Electronic Technical Manual',
    icon:        '💻',
    color:       'from-orange-500 to-red-500',
    description: 'Interactive Electronic Technical Manual project for digital maintenance and operation documentation.',
    priority:    'high',
    status:      'planning',
  },
  {
    id:          '3d_models',
    name:        '3D Models',
    fullName:    '3D Modelling & Animation',
    icon:        '🧊',
    color:       'from-violet-500 to-purple-600',
    description: 'End-to-end 3D modelling, rigging, texturing and animation project for product visualisation, training simulations or cinematic content.',
    priority:    'high',
    status:      'planning',
  },
]

const CreateNewProject = ({ onBack, onCreated }) => {
  const [form, setForm] = useState({
    name: '', description: '', start_date: new Date().toISOString().split('T')[0],
    deadline: '', priority: '', client: '', project_owner: '', project_group: '', status: 'planning',
  })
  const [showTemplates, setShowTemplates]   = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [employees, setEmployees] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [empSearch, setEmpSearch] = useState('')
  const [showEmpPanel, setShowEmpPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [taskProgress, setTaskProgress] = useState(null) // null | { current, total }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Apply template to form ────────────────────────────────────────────────
  const applyTemplate = (tpl) => {
    setSelectedTemplate(tpl.id)
    setForm(f => ({
      ...f,
      name:        f.name || tpl.name,
      description: f.description || tpl.description,
      priority:    tpl.priority,
      status:      tpl.status,
    }))
  }

  useEffect(() => {
    api.get('/employees?limit=200').then(res => {
      if (res.success) setEmployees(res.data || [])
    }).catch(() => {})
  }, [])

  const empName = (e) => e.name || ((e.first_name || '') + ' ' + (e.last_name || '')).trim()
  const selectedEmps = employees.filter(e => selectedIds.includes(e.id))
  const filteredEmps = employees.filter(e =>
    empName(e).toLowerCase().includes(empSearch.toLowerCase()) ||
    (e.designation || '').toLowerCase().includes(empSearch.toLowerCase())
  )
  const toggleEmp = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return }
    if (!form.start_date)  { toast.error('Start date is required'); return }
    if (!form.deadline)    { toast.error('End date is required'); return }
    setSaving(true)
    try {
      const res = await api.post('/projects', {
        name:            form.name.trim(),
        description:     form.description || null,
        start_date:      form.start_date,
        deadline:        form.deadline,
        priority:        form.priority || 'medium',
        client:          form.client || null,
        project_manager: form.project_owner || null,
        status:          form.status || 'planning',
        team_member_ids: selectedIds,
      })
      if (!res.success) { toast.error(res.message || 'Failed to create project'); setSaving(false); return }

      const project = res.data

      // ── Auto-create template tasks (line by line, like video chapters) ────
      const templateTasks = TEMPLATE_TASKS[selectedTemplate]
      if (templateTasks && templateTasks.length > 0) {
        // Need at least one assigned employee — use first selected or skip
        const assignTo = selectedIds[0] || null

        if (!assignTo) {
          toast('Project created! Add team members to auto-assign template tasks.', { icon: 'ℹ️', duration: 5000 })
        } else {
          setTaskProgress({ current: 0, total: templateTasks.length })

          // Calc due dates: start_date + seq days, one task per day
          const startDate = new Date(form.start_date)
          let failedCount = 0

          for (let i = 0; i < templateTasks.length; i++) {
            const t = templateTasks[i]
            const dueDate = new Date(startDate)
            dueDate.setDate(startDate.getDate() + t.seq)

            setTaskProgress({ current: i + 1, total: templateTasks.length })

            const taskRes = await api.post('/tasks', {
              title:        `${t.file_name} — ${t.title}`,
              description:  t.description,
              assigned_to:  parseInt(assignTo),
              priority:     'medium',
              due_date:     dueDate.toISOString().split('T')[0],
              status:       'todo',
              project_id:   parseInt(project.id),
              project_name: project.name,
              source:       'project_manager',
              tags:         [t.file_name],
            })

            if (!taskRes?.success) {
              failedCount++
              console.warn(`[Template Task ${i+1}/${templateTasks.length} FAILED]`, taskRes?.message, '| assigned_to:', parseInt(assignTo), '| project_id:', parseInt(project.id))
            }
          }

          setTaskProgress(null)
          if (failedCount === 0) {
            toast.success(`✅ Project created with ${templateTasks.length} template tasks!`)
          } else if (failedCount < templateTasks.length) {
            toast(`Project created. ${templateTasks.length - failedCount}/${templateTasks.length} tasks added (${failedCount} failed — check console)`, { icon: '⚠️', duration: 6000 })
          } else {
            toast.error(`Project created but tasks failed. Check if team members have employee profiles.`)
          }
        }
      } else {
        toast.success('Project created!')
      }

      onCreated(project)
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
    setTaskProgress(null)
  }

  const iCls = 'w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all'
  const sCls = iCls + ' appearance-none cursor-pointer'

  const PRIO = ['low', 'medium', 'high']
  const STAT = [
    { value: 'planning',    label: 'Planning' },
    { value: 'in_progress', label: 'Active' },
    { value: 'review',      label: 'Review' },
    { value: 'on_hold',     label: 'On Hold' },
    { value: 'completed',   label: 'Completed' },
    { value: 'cancelled',   label: 'Cancelled' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Set up your project details and team</p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Project Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FolderOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="Enter project name" className={iCls + ' pl-9'} autoFocus />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.description} onChange={e => setF('description', e.target.value)}
                placeholder="Enter project description..." className={iCls + ' pl-9'} maxLength={500} />
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-0.5">{form.description.length}/500</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Start Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} className={iCls + ' pl-9'} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              End Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="date" value={form.deadline} min={form.start_date}
                onChange={e => setF('deadline', e.target.value)} className={iCls + ' pl-9'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Flag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select value={form.priority} onChange={e => setF('priority', e.target.value)} className={sCls + ' pl-9'}>
                <option value="">Select priority</option>
                {PRIO.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Status</label>
            <div className="relative">
              <CheckCircle size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select value={form.status} onChange={e => setF('status', e.target.value)} className={sCls + ' pl-9'}>
                {STAT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Team Members</p>
                <p className="text-xs text-gray-400">Add team members to collaborate on this project</p>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowEmpPanel(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-500 hover:text-white transition-colors border border-primary-500/20">
              <Plus size={13} /> Add Members
            </motion.button>
          </div>
          {selectedEmps.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedEmps.map(e => (
                <motion.div key={e.id} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-medium text-primary-700 dark:text-primary-300">
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white text-[9px] font-bold">
                    {empName(e).charAt(0).toUpperCase()}
                  </div>
                  {empName(e)}
                  <button onClick={() => toggleEmp(e.id)} className="text-primary-400 hover:text-red-500 transition-colors ml-0.5">
                    <X size={11} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
          <AnimatePresence>
            {showEmpPanel && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                className="border border-gray-200 dark:border-dark-600 rounded-xl overflow-hidden shadow-lg">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-dark-700 border-b border-gray-100 dark:border-dark-600">
                  <Search size={13} className="text-gray-400 flex-shrink-0" />
                  <input autoFocus value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    placeholder="Search employee..."
                    className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none" />
                  {empSearch && (
                    <button onClick={() => setEmpSearch('')} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
                  )}
                  <button onClick={() => setShowEmpPanel(false)} className="text-gray-400 hover:text-gray-600 ml-1"><X size={13} /></button>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700 bg-white dark:bg-dark-800">
                  {filteredEmps.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No employees found</p>
                  ) : (
                    filteredEmps.map(emp => {
                      const isSel = selectedIds.includes(emp.id)
                      const name  = empName(emp)
                      return (
                        <button key={emp.id} onClick={() => toggleEmp(emp.id)}
                          className={'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left ' + (isSel ? 'bg-primary-500/5' : '')}>
                          <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ' + (isSel ? 'bg-primary-500' : 'bg-gray-400 dark:bg-dark-500')}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={'text-sm font-medium truncate ' + (isSel ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200')}>{name}</p>
                            {emp.designation && <p className="text-xs text-gray-400 truncate">{emp.designation}</p>}
                          </div>
                          <div className={'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ' + (isSel ? 'bg-primary-500 border-primary-500' : 'border-gray-300 dark:border-dark-500')}>
                            {isSel && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
                <div className="px-4 py-2 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-dark-600 text-[10px] text-gray-400">
                  {selectedIds.length} of {employees.length} selected
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Project Templates ── */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Project Templates</h3>
          <p className="text-xs text-gray-400 mt-0.5">Start faster with a pre-configured template</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-1">
          {PROJECT_TEMPLATES.map(tpl => {
            const isSelected = selectedTemplate === tpl.id
            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/8 dark:bg-primary-500/10'
                    : 'border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700'
                }`}
              >
                {/* Selected check */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-xl flex-shrink-0 shadow-sm`}>
                    {tpl.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{tpl.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{tpl.fullName}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-3">
                  {tpl.description}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 capitalize">
                    {tpl.priority}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-dark-600 text-gray-500 dark:text-gray-400 capitalize">
                    {tpl.status}
                  </span>
                </div>

                {/* Use Template button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyTemplate(tpl)}
                  className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white'
                  }`}
                >
                  {isSelected ? '✓ Template Applied' : 'Use Template'}
                </motion.button>
              </motion.div>
            )
          })}
        </div>

        <p className="text-[10px] text-gray-400 mt-2">
          Click a template to auto-fill the form. You can still edit all fields after applying.
        </p>

        {selectedTemplate && (
          <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-xl bg-primary-500/8 border border-primary-500/20 text-xs">
            <span className="text-primary-600 dark:text-primary-400 font-semibold">
              ✓ Template applied: {PROJECT_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
            </span>
            <button onClick={() => setSelectedTemplate(null)} className="ml-auto text-gray-400 hover:text-gray-600">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Task creation progress bar ── */}
      {taskProgress && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mx-0 px-5 py-4 rounded-2xl bg-primary-500/8 border border-primary-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-primary-300 border-t-primary-500 rounded-full inline-block" />
              Creating template tasks…
            </span>
            <span className="text-sm font-bold text-primary-500">
              {taskProgress.current} / {taskProgress.total}
            </span>
          </div>
          <div className="h-2 bg-primary-500/20 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(taskProgress.current / taskProgress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
            />
          </div>
          <p className="text-[11px] text-primary-400 mt-1.5">
            {taskProgress.current < taskProgress.total
              ? `Setting up: ${TEMPLATE_TASKS['3d_models']?.[taskProgress.current - 1]?.title || '...'}`
              : '✅ All tasks created!'}
          </p>
        </motion.div>
      )}

      <div className="flex items-center justify-end gap-3 pb-6">
        <button onClick={onBack} disabled={saving}
          className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-40">
          Cancel
        </button>
        <motion.button onClick={handleCreate} disabled={saving || !form.name.trim()}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-50 shadow-md shadow-primary-500/20">
          {saving ? (
            taskProgress
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  {taskProgress.current}/{taskProgress.total} Tasks…</>
              : <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Creating…</>
          ) : (
            <><Plus size={15} /> Create Project</>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ── Project Groups Tab ────────────────────────────────────────────────────────
const ProjectGroupsTab = ({ projects, loading }) => {
  const navigate = useNavigate()
  const active = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled')

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : active.length === 0 ? (
        <div className="py-14 text-center">
          <Layers size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No active projects</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((p, i) => {
            const members = p.members || []
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate('/pm/projects/' + p.id)}
                className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer">
                <div className="h-1.5 bg-gradient-to-r from-primary-500 to-purple-500" />
                <div className="p-4 pb-3 border-b border-gray-50 dark:border-dark-700">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <FolderOpen size={14} className="text-primary-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + statusBadge(p.status)}>
                          {statusLabel(p.status)}
                        </span>
                        <span className="text-[10px] text-gray-400">{p.task_count || 0} tasks</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">
                    Team — {members.length} {members.length === 1 ? 'person' : 'people'}
                  </p>
                  {members.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No members assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m, mi) => {
                        const name = ((m.first_name || '') + ' ' + (m.last_name || '')).trim()
                        return (
                          <div key={mi} className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 dark:bg-dark-700">
                            <Avatar name={name} src={m.avatar_url} size="sm" animate={false} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">{name}</p>
                              {m.designation && <p className="text-[10px] text-gray-400 truncate">{m.designation}</p>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {(p.task_count || 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-dark-600">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-bold text-primary-500">{p.completion_percent || 0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: (p.completion_percent || 0) + '%' }}
                          transition={{ duration: 0.8, delay: i * 0.06 }}
                          className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'active', label: 'Active Projects', icon: FolderOpen },
  { id: 'groups', label: 'Project Groups',  icon: Layers },
]

const PMProjects = () => {
  const [tab,        setTab]        = useState('active')
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/projects?limit=200')
      if (res.success) {
        const data = res.data?.projects || res.data || []
        setProjects(data)
        const recent = data.slice(0, 4).map(p => ({ id: p.id, name: p.name }))
        localStorage.setItem('epip_recent_projects', JSON.stringify(recent))
      }
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [newProject, ...prev])
    setTab('active')
    setShowCreate(false)
    load(true)
  }

  if (showCreate) {
    return <CreateNewProject onBack={() => setShowCreate(false)} onCreated={handleProjectCreated} />
  }

  return (
    <motion.div initial="hidden" animate="show" className="space-y-4 sm:space-y-5">
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {projects.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
            <motion.div animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 shadow-md shadow-primary-500/25 hover:shadow-lg transition-all">
            <Plus size={14} /> New Project
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ' +
              (tab === t.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300')}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === 'active' && (
            <ActiveProjectsTab
              projects={projects}
              loading={loading}
              onDeleteProject={(id) => setProjects(prev => prev.filter(p => p.id !== id))}
              onRefresh={() => load(true)}
            />
          )}
          {tab === 'groups' && <ProjectGroupsTab projects={projects} loading={loading} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

export default PMProjects
