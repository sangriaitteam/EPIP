// Reports.jsx — PM Workload Report (Zoho Projects style)
// Calendar grid: employees × days, hover popup, + click → assign task panel
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar,
  Clock, User, CheckSquare, AlertCircle
} from 'lucide-react'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const fmtDay = (d) => d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 1)
const isSameDay = (a, b) => a.toDateString() === b.toDateString()
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6
const isToday   = (d) => isSameDay(d, new Date())

const getDaysInMonth = (year, month) => {
  const days = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

const WORK_HOURS_PER_DAY = 8

// workload color based on % of capacity
const workloadColor = (pct) => {
  if (pct === 0)    return 'bg-transparent'
  if (pct <= 50)    return 'bg-green-400'
  if (pct <= 80)    return 'bg-yellow-400'
  if (pct <= 100)   return 'bg-orange-400'
  return 'bg-red-500'
}

// ── Day Popup ─────────────────────────────────────────────────────────────────
const DayPopup = ({ employee, day, dayTasks, onAddTask, onClose }) => {
  const totalHours    = WORK_HOURS_PER_DAY
  const assignedHours = dayTasks.reduce((s, t) => s + (t.estimated_hours || 1), 0)
  const freeHours     = Math.max(0, totalHours - assignedHours)
  const pct           = Math.min(100, Math.round((assignedHours / totalHours) * 100))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 6 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-64 bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-4"
      style={{ top: '110%', left: '50%', transform: 'translateX(-50%)' }}
    >
      {/* Employee + date */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar name={employee.name} size="sm" />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{employee.name}</p>
          <p className="text-xs text-gray-400">{fmt(day)}</p>
        </div>
      </div>

      <div className="space-y-2 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Total Availability</span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">100% · {totalHours}h 00m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Work Hours Assigned</span>
          <span className={`font-semibold ${pct > 80 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
            {pct}% · {assignedHours}h 00m
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Free time</span>
          <span className="font-semibold text-green-600">{100 - pct}% · {freeHours}h 00m</span>
        </div>
      </div>

      {/* Workload bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${workloadColor(pct)}`}
          style={{ width: `${pct}%` }} />
      </div>

      {/* Tasks on this day */}
      {dayTasks.length > 0 && (
        <div className="mb-3 space-y-1">
          {dayTasks.slice(0, 3).map(t => (
            <div key={t.id} className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
              <CheckSquare size={10} className="text-primary-500 flex-shrink-0" />
              <span className="truncate">{t.title}</span>
            </div>
          ))}
          {dayTasks.length > 3 && (
            <p className="text-[10px] text-gray-400">+{dayTasks.length - 3} more</p>
          )}
        </div>
      )}

      {pct === 0 && (
        <p className="text-[11px] text-gray-400 mb-3">⚪ Unallocated</p>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onAddTask(employee, day) }}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
      >
        <Plus size={12} /> Add Task
      </button>
    </motion.div>
  )
}

// ── Assign Task Drawer ────────────────────────────────────────────────────────
const AssignTaskDrawer = ({ employee, day, employees, projects, onClose, onTaskAdded }) => {
  const [form, setForm] = useState({
    project_id:  '',
    title:       '',
    assigned_to: employee?.id || '',
    description: '',
    due_date:    day ? day.toISOString().split('T')[0] : '',
    priority:    'medium',
  })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.title.trim())       { toast.error('Task name is required'); return }
    if (!form.assigned_to)        { toast.error('Select an employee'); return }

    setSaving(true)
    try {
      const payload = {
        title:        form.title,
        description:  form.description,
        assigned_to:  parseInt(form.assigned_to),
        priority:     form.priority,
        due_date:     form.due_date || null,
        project_id:   form.project_id ? parseInt(form.project_id) : null,
        project_name: form.project_id
          ? projects.find(p => String(p.id) === String(form.project_id))?.name || ''
          : null,
        source: 'project_manager',
      }
      const res = await api.post('/tasks', payload)
      if (res.success) {
        toast.success(`Task assigned to ${employees.find(e => String(e.id) === String(form.assigned_to))?.name || 'employee'} ✅`)
        onTaskAdded(res.data)
        onClose()
      } else {
        toast.error(res.message || 'Failed to create task')
      }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  const inputCls = `w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
    bg-white dark:bg-dark-700 text-gray-900 dark:text-white
    focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-md bg-white dark:bg-dark-800 h-full overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-600 sticky top-0 bg-white dark:bg-dark-800 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <CheckSquare size={15} className="text-primary-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Assign Task</h2>
              {day && <p className="text-xs text-gray-400">{fmt(day)}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 flex-1">

          {/* Project */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Project
            </label>
            <select value={form.project_id} onChange={e => setF('project_id', e.target.value)} className={inputCls}>
              <option value="">Select Project (optional)</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.title}</option>
              ))}
            </select>
          </div>

          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Task Name <span className="text-red-500">*</span>
            </label>
            <input
              value={form.title}
              onChange={e => setF('title', e.target.value)}
              placeholder="Enter task name"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Select Employee */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Assign To <span className="text-red-500">*</span>
            </label>
            <select value={form.assigned_to} onChange={e => setF('assigned_to', e.target.value)} className={inputCls}>
              <option value="">Select employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.name || `${e.first_name} ${e.last_name}`}</option>
              ))}
            </select>
            {form.assigned_to && (
              <p className="text-xs text-primary-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> Employee will be notified on task creation
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button key={p} onClick={() => setF('priority', p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border-2 transition-all ${
                    form.priority === p
                      ? p === 'high'   ? 'border-red-500 bg-red-500/10 text-red-600'
                      : p === 'medium' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600'
                                       : 'border-green-500 bg-green-500/10 text-green-600'
                      : 'border-gray-200 dark:border-dark-600 text-gray-500 hover:border-gray-300'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Due Date
            </label>
            <input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)}
              className={inputCls} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={e => setF('description', e.target.value)}
              placeholder="Task details, instructions…"
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-dark-600 flex gap-3 sticky bottom-0 bg-white dark:bg-dark-800">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            Cancel
          </button>
          <motion.button onClick={handleAdd} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-60 transition-all">
            {saving
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <><Plus size={15} /> Add Task</>
            }
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
const PMReports = () => {
  const today = new Date()
  const [year,       setYear]       = useState(today.getFullYear())
  const [month,      setMonth]      = useState(today.getMonth())
  const [employees,  setEmployees]  = useState([])
  const [projects,   setProjects]   = useState([])
  const [tasks,      setTasks]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [hoveredCell,setHoveredCell]= useState(null)  // { empId, dayIdx }
  const [assignPanel,setAssignPanel]= useState(null)  // { employee, day }
  const hoverTimer = useRef(null)

  const days = getDaysInMonth(year, month)

  const load = async () => {
    setLoading(true)
    try {
      const [empRes, projRes, taskRes] = await Promise.all([
        api.get('/employees?limit=200'),
        api.get('/projects?limit=100'),
        api.get('/tasks/team?limit=500'),
      ])
      if (empRes.success)  setEmployees(empRes.data || [])
      if (projRes.success) setProjects(projRes.data?.projects || projRes.data || [])
      if (taskRes.success) setTasks(taskRes.data || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Get tasks for an employee on a specific day
  const getTasksForDay = (empId, day) => {
    return tasks.filter(t => {
      if (String(t.assigned_to) !== String(empId)) return false
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      return isSameDay(due, day)
    })
  }

  // Total tasks for employee in the month
  const getMonthTasks = (empId) => {
    return tasks.filter(t => {
      if (String(t.assigned_to) !== String(empId)) return false
      if (!t.due_date) return false
      const due = new Date(t.due_date)
      return due.getFullYear() === year && due.getMonth() === month
    })
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const handleCellMouseEnter = (empId, dayIdx) => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      setHoveredCell({ empId, dayIdx })
    }, 300)
  }

  const handleCellMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setHoveredCell(null)
  }

  const handleAddTask = (employee, day) => {
    setHoveredCell(null)
    setAssignPanel({ employee, day })
  }

  const handleTaskAdded = (newTask) => {
    setTasks(prev => [...prev, newTask])
  }

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Workload Report</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Team task allocation — hover a day to see details, click + to assign
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-white min-w-[110px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-x-auto">
        {/* Mobile scroll hint */}
        <div className="sm:hidden flex items-center gap-2 px-4 py-2 bg-blue-500/5 border-b border-blue-500/10">
          <span className="text-xs text-blue-600 dark:text-blue-400">← Swipe to see full calendar →</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
          </div>
        ) : (
          <table className="w-full text-xs" style={{ minWidth: `${200 + days.length * 36}px` }}>
            <thead>
              <tr className="border-b border-gray-100 dark:border-dark-600">
                {/* Employee col header */}
                <th className="sticky left-0 bg-white dark:bg-dark-800 z-10 px-4 py-3 text-left min-w-[180px]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <User size={12} /> Task Owner
                  </div>
                </th>
                {/* Total column */}
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[80px] border-r border-gray-100 dark:border-dark-600">
                  <div>{MONTHS[month].slice(0,3)} 1-{days.length}</div>
                  <div className="text-[10px] text-gray-400">{days.filter(d => !isWeekend(d)).length * WORK_HOURS_PER_DAY} hours</div>
                </th>
                {/* Day columns */}
                {days.map((day, i) => (
                  <th key={i}
                    className={`px-0 py-2 text-center min-w-[34px] ${
                      isToday(day) ? 'bg-primary-500/10' : isWeekend(day) ? 'bg-gray-50 dark:bg-dark-700/50' : ''
                    }`}
                  >
                    <div className={`text-[10px] font-medium ${isToday(day) ? 'text-primary-600' : 'text-gray-400'}`}>
                      {fmtDay(day)}
                    </div>
                    <div className={`text-[11px] font-bold ${isToday(day) ? 'text-white bg-primary-500 rounded-full w-5 h-5 flex items-center justify-center mx-auto' : 'text-gray-600 dark:text-gray-300'}`}>
                      {day.getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 2} className="py-12 text-center text-gray-400 text-sm">
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((emp, empIdx) => {
                  const empName     = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                  const monthTasks  = getMonthTasks(emp.id)
                  const totalHours  = days.filter(d => !isWeekend(d)).length * WORK_HOURS_PER_DAY
                  const assignedHrs = monthTasks.length * WORK_HOURS_PER_DAY
                  const loadPct     = Math.min(100, Math.round((assignedHrs / totalHours) * 100))

                  return (
                    <tr key={emp.id} className="border-b border-gray-50 dark:border-dark-700 hover:bg-gray-50/50 dark:hover:bg-dark-700/30 transition-colors">
                      {/* Employee name */}
                      <td className="sticky left-0 bg-white dark:bg-dark-800 z-10 px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={empName} src={emp.avatar_url} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 dark:text-gray-200 truncate text-xs">{empName}</p>
                            <p className="text-[10px] text-gray-400 truncate">{emp.designation || emp.department_name || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Month total bar */}
                      <td className="px-3 py-2.5 border-r border-gray-100 dark:border-dark-600 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-16 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${workloadColor(loadPct)}`}
                              style={{ width: `${loadPct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400">{monthTasks.length} tasks</span>
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map((day, dayIdx) => {
                        const dayTasks   = getTasksForDay(emp.id, day)
                        const dayPct     = Math.min(100, dayTasks.length * 25)
                        const isHovered  = hoveredCell?.empId === emp.id && hoveredCell?.dayIdx === dayIdx
                        const weekend    = isWeekend(day)
                        const todayCell  = isToday(day)

                        return (
                          <td key={dayIdx}
                            className={`relative px-0.5 py-1.5 text-center cursor-pointer transition-colors ${
                              weekend   ? 'bg-gray-50/50 dark:bg-dark-700/30' :
                              todayCell ? 'bg-primary-500/5' : ''
                            } hover:bg-primary-500/10 group`}
                            onMouseEnter={() => !weekend && handleCellMouseEnter(emp.id, dayIdx)}
                            onMouseLeave={handleCellMouseLeave}
                          >
                            {/* Workload bar */}
                            {!weekend && dayTasks.length > 0 && (
                              <div className="mx-1 h-5 rounded-md overflow-hidden relative"
                                style={{ background: dayPct > 80 ? '#fee2e2' : dayPct > 50 ? '#fef9c3' : '#dcfce7' }}>
                                <div className={`h-full rounded-md transition-all ${workloadColor(dayPct)}`}
                                  style={{ width: `${dayPct}%`, opacity: 0.7 }} />
                              </div>
                            )}

                            {/* + hover button */}
                            {!weekend && dayTasks.length === 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddTask(emp, day) }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-primary-500/20 hover:bg-primary-500 text-primary-600 hover:text-white flex items-center justify-center mx-auto"
                              >
                                <Plus size={10} />
                              </button>
                            )}

                            {/* + on cells with tasks too */}
                            {!weekend && dayTasks.length > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddTask(emp, day) }}
                                className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center"
                              >
                                <Plus size={8} />
                              </button>
                            )}

                            {/* Hover popup */}
                            <AnimatePresence>
                              {isHovered && !weekend && (
                                <DayPopup
                                  employee={{ ...emp, name: empName }}
                                  day={day}
                                  dayTasks={dayTasks}
                                  onAddTask={handleAddTask}
                                  onClose={() => setHoveredCell(null)}
                                />
                              )}
                            </AnimatePresence>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
        <span className="font-semibold">Workload:</span>
        {[
          { color: 'bg-green-400',  label: 'Low (≤50%)'    },
          { color: 'bg-yellow-400', label: 'Medium (≤80%)' },
          { color: 'bg-orange-400', label: 'High (≤100%)'  },
          { color: 'bg-red-500',    label: 'Overloaded'    },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Assign Task Drawer */}
      <AnimatePresence>
        {assignPanel && (
          <AssignTaskDrawer
            employee={assignPanel.employee}
            day={assignPanel.day}
            employees={employees}
            projects={projects}
            onClose={() => setAssignPanel(null)}
            onTaskAdded={handleTaskAdded}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

export default PMReports
