import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare, Plus, X, CheckCircle, Calendar,
  Flag, User, Search, Trash2, Clock, AlertCircle
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import { api } from '../../services/api'
import { employeeService } from '../../services/employeeService'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Low',    color: 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
  { value: 'high',   label: 'High',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
]

const priorityColor = (p) => PRIORITY_OPTIONS.find(o => o.value === p)?.color || ''
const statusColor = (s) => {
  if (s === 'todo')        return 'bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-gray-400'
  if (s === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
  if (s === 'review')      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
  if (s === 'done')        return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
  return 'bg-gray-100 text-gray-600'
}

const inputCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

const EMPTY_FORM = {
  title:       '',
  description: '',
  assigned_to: '',
  priority:    'medium',
  due_date:    '',
}

// ── Task Form Modal ──────────────────────────────────────────────────────────
const TaskFormModal = ({ employees, onClose, onCreated }) => {
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredEmps = employees.filter(e => {
    const name = e.name || `${e.first_name||''} ${e.last_name||''}`.trim()
    return name.toLowerCase().includes(empSearch.toLowerCase()) ||
           (e.designation||'').toLowerCase().includes(empSearch.toLowerCase())
  })

  const selectedEmp = employees.find(e => e.id === parseInt(form.assigned_to))
  const selectedName = selectedEmp
    ? (selectedEmp.name || `${selectedEmp.first_name||''} ${selectedEmp.last_name||''}`.trim())
    : ''

  const handleSave = async () => {
    if (!form.title.trim())  { toast.error('Task title is required'); return }
    if (!form.assigned_to)   { toast.error('Please select an employee'); return }
    if (!form.due_date)      { toast.error('Due date is required'); return }

    setSaving(true)
    try {
      const res = await api.post('/tasks', {
        title:       form.title.trim(),
        description: form.description || null,
        assigned_to: parseInt(form.assigned_to),
        priority:    form.priority,
        due_date:    form.due_date,
      })
      if (res.success) {
        toast.success(`✅ Task assigned to ${selectedName}! They will be notified.`)
        onCreated(res.data)
        onClose()
      } else {
        toast.error(res.message || 'Failed to assign task')
      }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ y:'100%', opacity:0 }} animate={{ y:0, opacity:1 }}
        exit={{ y:'100%', opacity:0 }}
        transition={{ type:'spring', stiffness:280, damping:28 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-lg
                   rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <CheckSquare size={17} className="text-primary-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Assign Task</h2>
              <p className="text-xs text-gray-400">Create and assign a task to an employee</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="e.g. Design landing page mockup"
              className={inputCls} autoFocus />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea value={form.description} onChange={e => setF('description', e.target.value)}
              placeholder="Task details and requirements..."
              rows={3}
              className={`${inputCls} resize-none`} />
          </div>

          {/* Assign to Employee */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assign To <span className="text-red-500">*</span>
            </label>
            {form.assigned_to ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <Avatar name={selectedName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selectedName}</p>
                  <p className="text-xs text-gray-400 truncate">{selectedEmp?.designation || '—'}</p>
                </div>
                <button onClick={() => { setF('assigned_to', ''); setEmpSearch('') }}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-dark-600 rounded-xl overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-dark-600">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                      placeholder="Search employee..."
                      className="w-full pl-7 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-dark-700 rounded-lg border-none outline-none text-gray-900 dark:text-white placeholder-gray-400" />
                  </div>
                </div>
                <div className="max-h-36 overflow-y-auto">
                  {filteredEmps.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No employees found</p>
                  ) : filteredEmps.map(emp => {
                    const name = emp.name || `${emp.first_name||''} ${emp.last_name||''}`.trim()
                    return (
                      <button key={emp.id} type="button"
                        onClick={() => { setF('assigned_to', emp.id.toString()); setEmpSearch('') }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left">
                        <Avatar name={name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{emp.designation || '—'}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setF('priority', opt.value)}
                  className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.priority === opt.value
                      ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400 hover:border-primary-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.due_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setF('due_date', e.target.value)}
              className={inputCls} />
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Employee will receive a notification as soon as the task is assigned.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200
                       dark:border-dark-600 text-gray-600 dark:text-gray-400
                       hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            Cancel
          </button>
          <motion.button onClick={handleSave} disabled={saving}
            whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                       text-sm font-semibold text-white bg-primary-500
                       hover:bg-primary-600 disabled:opacity-60 transition-colors">
            {saving
              ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Assigning…</>
              : <><CheckSquare size={15} /> Assign Task</>
            }
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
const HRAssignTasks = () => {
  const [tasks,      setTasks]      = useState([])
  const [employees,  setEmployees]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [filterEmp,  setFilterEmp]  = useState('all')
  const [filterPri,  setFilterPri]  = useState('all')
  const [search,     setSearch]     = useState('')

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [taskRes, emps] = await Promise.all([
          api.get('/tasks/team'),
          employeeService.getAll(),
        ])
        if (taskRes.success) setTasks(taskRes.data || [])
        if (emps?.length)    setEmployees(emps)
      } catch {}
      setLoading(false)
    }
    init()
  }, [])

  const handleCreated = (task) => setTasks(prev => [task, ...prev])

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/tasks/${id}`)
      if (res.success) {
        setTasks(prev => prev.filter(t => t.id !== id))
        toast.success('Task deleted')
      }
    } catch { toast.error('Cannot connect to server') }
  }

  // Filters
  const filtered = tasks.filter(t => {
    const matchEmp   = filterEmp === 'all' || t.assigned_to === parseInt(filterEmp)
    const matchPri   = filterPri === 'all' || t.priority === filterPri
    const matchSearch = (t.title||'').toLowerCase().includes(search.toLowerCase()) ||
                        (t.employee_name||'').toLowerCase().includes(search.toLowerCase())
    return matchEmp && matchPri && matchSearch
  })

  const empOptions = employees.map(e => ({
    id:   e.id,
    name: e.name || `${e.first_name||''} ${e.last_name||''}`.trim(),
  }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Task Assignment</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Assign tasks to employees — they get notified immediately
          </p>
        </div>
        <motion.button whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                     text-white bg-primary-500 hover:bg-primary-600
                     shadow-md shadow-primary-500/25 transition-colors">
          <Plus size={16} /> Assign Task
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="all">All Employees</option>
          {empOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterPri} onChange={e => setFilterPri(e.target.value)}
          className="px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="all">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center
                        rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <CheckSquare size={36} className="text-gray-300 dark:text-dark-500 mb-3" />
          <p className="font-medium text-gray-500 dark:text-gray-400">
            {search || filterEmp !== 'all' || filterPri !== 'all' ? 'No tasks found' : 'No tasks assigned yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">Click "+ Assign Task" to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((task, i) => (
              <motion.div key={task.id}
                initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, scale:0.97 }}
                transition={{ delay: i*0.03 }}
                className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100
                           dark:border-dark-600 shadow-sm p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{task.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${priorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(task.status)}`}>
                        {(task.status||'').replace('_', ' ')}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {task.employee_name && (
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-primary-500" />
                          Assigned to: <strong className="text-gray-700 dark:text-gray-200 ml-1">{task.employee_name}</strong>
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-red-500" />
                          Due: {formatDate(task.due_date)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {task.completion_percent || 0}% complete
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(task.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10
                               text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <TaskFormModal
            employees={employees}
            onClose={() => setShowForm(false)}
            onCreated={handleCreated}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default HRAssignTasks
