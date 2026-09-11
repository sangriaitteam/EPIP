import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Plus, X, CheckCircle, Calendar,
  Users, Briefcase, User, Trash2, Edit2, CheckSquare, AlertCircle
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import { employeeService } from '../../services/employeeService'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'planning',    label: 'Planning',    color: 'bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-gray-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { value: 'review',      label: 'Review',      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
  { value: 'completed',   label: 'Completed',   color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
]

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const statusStyle = (s) => STATUS_OPTIONS.find(o => o.value === s)?.color || 'bg-gray-100 text-gray-600'
const statusLabel = (s) => STATUS_OPTIONS.find(o => o.value === s)?.label || s

const inputCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

const EMPTY_PROJECT = { name: '', client: '', start_date: '', deadline: '', project_manager: '', team_member_ids: [], status: 'planning' }
const EMPTY_TASK    = { title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' }

// ── Project Form Modal ─────────────────────────────────────────────────────
const ProjectFormModal = ({ project, employees, onClose, onSaved }) => {
  const [form,   setForm]   = useState(project ? {
    name: project.name, client: project.client||'',
    start_date: project.start_date||'', deadline: project.deadline||'',
    project_manager: project.project_manager||'',
    team_member_ids: (project.members||[]).map(m => m.employee_id),
    status: project.status||'planning',
  } : EMPTY_PROJECT)
  const [saving, setSaving] = useState(false)
  const setF = (k,v) => setForm(f => ({...f,[k]:v}))

  const toggleMember = (id) => setF('team_member_ids',
    form.team_member_ids.includes(id)
      ? form.team_member_ids.filter(x=>x!==id)
      : [...form.team_member_ids, id]
  )

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return }
    setSaving(true)
    try {
      const payload = { ...form, team_member_ids: form.team_member_ids }
      const res = project
        ? await api.put(`/projects/${project.id}`, payload)
        : await api.post('/projects', payload)
      if (res.success) { toast.success(project ? 'Project updated!' : 'Project created! ✅'); onSaved(); onClose() }
      else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{y:'100%',opacity:0}} animate={{y:0,opacity:1}} exit={{y:'100%',opacity:0}}
        transition={{type:'spring',stiffness:280,damping:28}}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden">
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <FolderOpen size={17} className="text-primary-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{project ? 'Edit Project' : 'New Project'}</h2>
              <p className="text-xs text-gray-400">Fill in the project details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400"><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* 1. Project Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="e.g. Brand Campaign Q4 2026" className={inputCls} autoFocus />
          </div>
          {/* 2. Client */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
            <input value={form.client} onChange={e=>setF('client',e.target.value)} placeholder="e.g. Acme Corp" className={inputCls} />
          </div>
          {/* 3. Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setF('start_date',e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline</label>
              <input type="date" value={form.deadline} min={form.start_date} onChange={e=>setF('deadline',e.target.value)} className={inputCls} />
            </div>
          </div>
          {/* 4. Project Manager */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project Manager</label>
            <input value={form.project_manager} onChange={e=>setF('project_manager',e.target.value)} placeholder="e.g. Ruthish S" className={inputCls} />
          </div>
          {/* 5. Team Members */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Team Members</label>
            <div className="border border-gray-200 dark:border-dark-600 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {employees.length === 0
                ? <p className="text-xs text-gray-400 text-center py-4">No employees available</p>
                : employees.map(emp => {
                    const name = emp.name||`${emp.first_name||''} ${emp.last_name||''}`.trim()
                    const sel  = form.team_member_ids.includes(emp.id)
                    return (
                      <button key={emp.id} type="button" onClick={()=>toggleMember(emp.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel ? 'bg-primary-500/10 border-l-2 border-primary-500' : 'hover:bg-gray-50 dark:hover:bg-dark-700'}`}>
                        <Avatar name={name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{emp.designation||'—'}</p>
                        </div>
                        {sel && <CheckCircle size={15} className="text-primary-500 flex-shrink-0"/>}
                      </button>
                    )
                  })
              }
            </div>
            {form.team_member_ids.length > 0 && (
              <p className="text-xs text-primary-500 font-medium">{form.team_member_ids.length} member{form.team_member_ids.length!==1?'s':''} selected</p>
            )}
          </div>
          {/* 6. Status */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={()=>setF('status',opt.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.status===opt.value ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400 hover:border-primary-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">Cancel</button>
          <motion.button onClick={handleSave} disabled={saving} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors">
            {saving ? <><motion.div animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:'linear'}} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Saving…</> : <><CheckCircle size={15}/>{project?'Save Changes':'Create Project'}</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Assign Task Modal ──────────────────────────────────────────────────────
const AssignTaskModal = ({ project, onClose, onAssigned }) => {
  const [form,   setForm]   = useState(EMPTY_TASK)
  const [saving, setSaving] = useState(false)
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))
  const members = project.members || []

  const handleAssign = async () => {
    if (!form.title.trim()) { toast.error('Task title is required'); return }
    if (!form.assigned_to)  { toast.error('Select a team member'); return }
    if (!form.due_date)     { toast.error('Due date is required'); return }
    setSaving(true)
    try {
      const res = await api.post('/tasks', {
        title: form.title.trim(), description: form.description||null,
        assigned_to: parseInt(form.assigned_to),
        priority: form.priority, due_date: form.due_date,
        project_id: project.id, project_name: project.name, source: 'superadmin',
      })
      if (res.success) { toast.success('✅ Task assigned! Employee notified.'); onAssigned(); onClose() }
      else toast.error(res.message||'Failed')
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{y:'100%',opacity:0}} animate={{y:0,opacity:1}} exit={{y:'100%',opacity:0}}
        transition={{type:'spring',stiffness:280,damping:28}}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden">
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mt-3 sm:hidden"/>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <CheckSquare size={17} className="text-primary-500"/>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Assign Task</h2>
              <p className="text-xs text-gray-400 truncate max-w-[180px]">Project: {project.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400"><X size={16}/></button>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e=>setF('title',e.target.value)} placeholder="e.g. Design homepage mockup" className={inputCls} autoFocus/>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={form.description} onChange={e=>setF('description',e.target.value)} rows={2} placeholder="Task details..." className={`${inputCls} resize-none`}/>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assign To <span className="text-red-500">*</span></label>
            {members.length === 0
              ? <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle size={14} className="text-yellow-500"/>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">No team members. Add members to this project first.</p>
                </div>
              : <div className="border border-gray-200 dark:border-dark-600 rounded-xl overflow-hidden">
                  {members.map(m => {
                    const name = `${m.first_name} ${m.last_name}`
                    const sel  = form.assigned_to === m.employee_id.toString()
                    return (
                      <button key={m.employee_id} type="button" onClick={()=>setF('assigned_to',m.employee_id.toString())}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel?'bg-primary-500/10 border-l-2 border-primary-500':'hover:bg-gray-50 dark:hover:bg-dark-700'}`}>
                        <Avatar name={name} size="sm"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                          <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                        </div>
                        {sel && <CheckCircle size={15} className="text-primary-500 flex-shrink-0"/>}
                      </button>
                    )
                  })}
                </div>
            }
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={()=>setF('priority',opt.value)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${form.priority===opt.value?'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400':'border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.due_date} min={new Date().toISOString().split('T')[0]} onChange={e=>setF('due_date',e.target.value)} className={inputCls}/>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
            <p className="text-xs text-blue-600 dark:text-blue-400">Employee will receive a <strong>notification</strong> and see this under <strong>"My Tasks → From SuperAdmin"</strong>.</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">Cancel</button>
          <motion.button onClick={handleAssign} disabled={saving||members.length===0} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors">
            {saving?<><motion.div animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:'linear'}} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Assigning…</>:<><CheckSquare size={15}/>Assign Task</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Project Card ───────────────────────────────────────────────────────────
const ProjectCard = ({ project, onEdit, onDelete, onAssignTask }) => (
  <motion.div
    initial={{opacity:0,y:14}} animate={{opacity:1,y:0}}
    exit={{opacity:0,scale:0.97}} whileHover={{y:-3}}
    transition={{type:'spring',stiffness:130}}
    className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-md hover:shadow-xl transition-all p-5 flex flex-col"
  >
    {/* Header */}
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 dark:text-white text-base truncate mb-1">{project.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyle(project.status)}`}>
            {statusLabel(project.status)}
          </span>
          {project.client && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Briefcase size={10}/>{project.client}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={()=>onEdit(project)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 hover:text-primary-500 transition-colors"><Edit2 size={14}/></button>
        <button onClick={()=>onDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
      </div>
    </div>

    {/* Details */}
    <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-1">
      {(project.start_date || project.deadline) && (
        <div className="flex items-center gap-3 flex-wrap">
          {project.start_date && <span className="flex items-center gap-1"><Calendar size={11} className="text-green-500"/>Start: {formatDate(project.start_date)}</span>}
          {project.deadline   && <span className="flex items-center gap-1"><Calendar size={11} className="text-red-500"/>Due: {formatDate(project.deadline)}</span>}
        </div>
      )}
      {project.project_manager && (
        <div className="flex items-center gap-1">
          <User size={11} className="text-primary-500 flex-shrink-0"/>
          <span>Manager: <strong className="text-gray-700 dark:text-gray-200">{project.project_manager}</strong></span>
        </div>
      )}
      {(project.members?.length > 0) && (
        <div className="flex items-center gap-2">
          <Users size={11} className="text-gray-400 flex-shrink-0"/>
          <div className="flex -space-x-1.5">
            {project.members.slice(0,5).map(m => (
              <div key={m.employee_id} title={`${m.first_name} ${m.last_name}`}
                className="w-6 h-6 rounded-full bg-primary-500 border-2 border-white dark:border-dark-800 flex items-center justify-center text-white text-[9px] font-bold">
                {`${m.first_name?.[0]||''}${m.last_name?.[0]||''}`}
              </div>
            ))}
            {project.members.length>5 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-dark-600 border-2 border-white dark:border-dark-800 flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300">
                +{project.members.length-5}
              </div>
            )}
          </div>
          <span>{project.members.length} member{project.members.length!==1?'s':''}</span>
        </div>
      )}
    </div>

    {/* Assign Task Button */}
    <div className="pt-3 border-t border-gray-100 dark:border-dark-600">
      <button onClick={()=>onAssignTask(project)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                   text-sm font-semibold text-white bg-primary-500
                   hover:bg-primary-600 active:scale-95 transition-all">
        <CheckSquare size={15}/> Assign Task to Member
      </button>
    </div>
  </motion.div>
)

// ── Main Page ──────────────────────────────────────────────────────────────
const AdminProjects = () => {
  const [projects,    setProjects]    = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)
  const [assignProj,  setAssignProj]  = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [projRes, emps] = await Promise.all([
        api.get('/projects'),
        employeeService.getAll(),
      ])
      if (projRes.success) setProjects(projRes.data || [])
      if (emps?.length)    setEmployees(emps)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/projects/${id}`)
      if (res.success) { setProjects(prev=>prev.filter(p=>p.id!==id)); toast.success('Project deleted') }
      else toast.error(res.message||'Delete failed')
    } catch { toast.error('Cannot connect to server') }
    setDeleteId(null)
  }

  const byStatus = (s) => projects.filter(p=>p.status===s).length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {projects.length} project{projects.length!==1?'s':''}
          </p>
        </div>
        <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
          onClick={()=>{setEditProject(null);setShowForm(true)}}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 shadow-md shadow-primary-500/25 transition-colors">
          <Plus size={16}/> New Project
        </motion.button>
      </div>

      {/* Status pills */}
      {projects.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s=>(
            <span key={s.value} className={`px-3 py-1 rounded-full text-xs font-semibold ${s.color}`}>
              {s.label}: {byStatus(s.value)}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full"/>
        </div>
      ) : projects.length === 0 ? (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
          className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-primary-500"/>
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">No projects yet</h3>
          <p className="text-sm text-gray-400 mb-5">Click "+ New Project" to create your first project</p>
          <button onClick={()=>setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
            <Plus size={15}/> Create Project
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p}
                onEdit={proj=>{setEditProject(proj);setShowForm(true)}}
                onDelete={id=>setDeleteId(id)}
                onAssignTask={proj=>setAssignProj(proj)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Project Form Modal */}
      <AnimatePresence>
        {showForm && (
          <ProjectFormModal project={editProject} employees={employees}
            onClose={()=>{setShowForm(false);setEditProject(null)}}
            onSaved={()=>{setEditProject(null);load()}}/>
        )}
      </AnimatePresence>

      {/* Assign Task Modal */}
      <AnimatePresence>
        {assignProj && (
          <AssignTaskModal project={assignProj}
            onClose={()=>setAssignProj(null)}
            onAssigned={()=>{setAssignProj(null);load()}}/>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setDeleteId(null)}/>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6 w-full max-w-sm text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={22} className="text-red-500"/>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Project?</h3>
              <p className="text-sm text-gray-400 mb-5">This will permanently delete the project and all member assignments.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setDeleteId(null)} className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">Cancel</button>
                <button onClick={()=>handleDelete(deleteId)} className="py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default AdminProjects
