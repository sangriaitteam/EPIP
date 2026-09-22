import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Eye, EyeOff, Edit2, Trash2, Copy, CheckCircle, KeyRound, X, AlertTriangle, Users } from 'lucide-react'
import Card, { CardBody, CardHeader } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import ProgressBar from '../../components/common/ProgressBar'
import Input, { Select } from '../../components/common/Input'
import { employeeService } from '../../services/employeeService'
import { api } from '../../services/api'
import { getStatusColor, formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const EMPTY_FORM = {
  profile_name: '',
  department_id: '',
  username: '', password: '',
}

const EmployeeManagement = () => {
  const [employees,   setEmployees]   = useState([])
  const [search,      setSearch]      = useState('')
  const [filterDept,  setFilterDept]  = useState('all')
  const [showForm,    setShowForm]    = useState(false)
  const [editEmp,     setEditEmp]     = useState(null)
  const [deleteEmp,   setDeleteEmp]   = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [copied,      setCopied]      = useState({})
  const [showPass,    setShowPass]    = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    employeeService.getAll()
      .then(d => setEmployees(Array.isArray(d) ? d : []))
      .catch(() => setEmployees([]))
  }, [])

  const handleCopy = (key, val) => {
    navigator.clipboard.writeText(val)
    setCopied(c => ({ ...c, [key]: true }))
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000)
    toast.success(`${key} copied!`)
  }

  const openAdd = () => {
    setEditEmp(null)
    setForm(EMPTY_FORM)
    setCredentials(null)
    setShowForm(true)
  }

  const handleEdit = (emp) => {
    setEditEmp(emp)
    const name = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
    setForm({
      profile_name:  name,
      department_id: '',
      username: '', password: '',
    })
    setCredentials(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.profile_name.trim()) { toast.error('Profile name is required'); return }
    if (!editEmp) {
      if (!form.username.trim())    { toast.error('Username is required'); return }
      if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    }
    // Split profile_name into first_name + last_name
    const parts = form.profile_name.trim().split(/\s+/)
    const first_name = parts[0] || ''
    const last_name  = parts.slice(1).join(' ') || '.'
    setSaving(true)
    try {
      if (editEmp) {
        const res = await api.put(`/employees/${editEmp.id}`, {
          first_name,
          last_name,
        })
        if (res.success) {
          setEmployees(prev => prev.map(e => e.id === editEmp.id ? { ...e, ...res.data } : e))
          toast.success('Employee updated!')
          setShowForm(false); setEditEmp(null); setForm(EMPTY_FORM)
        } else toast.error(res.message || 'Update failed')
      } else {
        const res = await api.post('/employees', {
          ...form,
          first_name,
          last_name,
          email: `${form.username}@epip.internal`,
        })
        if (res.success) {
          setCredentials({ username: form.username, password: form.password })
          setEmployees(prev => [...prev, res.data.employee])
          toast.success('Employee created!')
          setForm(EMPTY_FORM)
        } else toast.error(res.message || 'Create failed')
      }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteEmp) return
    setDeleting(true)
    try {
      const res = await api.delete(`/employees/${deleteEmp.id}`)
      if (res.success) {
        setEmployees(prev => prev.filter(e => e.id !== deleteEmp.id))
        toast.success('Employee deleted')
        setDeleteEmp(null)
      } else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect to server') }
    setDeleting(false)
  }

  const departments = ['all', ...new Set(employees.map(e => e.department_name || e.department).filter(Boolean))]
  const filtered = employees.filter(e => {
    const name = e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim()
    const matchSearch = [name, e.email || '', e.designation || '']
      .some(v => v.toLowerCase().includes(search.toLowerCase()))
    const matchDept = filterDept === 'all' || (e.department_name || e.department) === filterDept
    return matchSearch && matchDept
  })

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── Header ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show"
        className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Employee Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {employees.length} total employee{employees.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 active:scale-95 transition-all shadow-md shadow-primary-500/25 whitespace-nowrap"
        >
          <Plus size={15} /> <span className="hidden xs:inline">Add</span> Employee
        </button>
      </motion.div>

      {/* ── Search + Dept filter ── */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-2">
        {/* Search bar — full width on mobile */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
                       bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
        {/* Dept filter pills — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setFilterDept(dept)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filterDept === dept
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
              }`}
            >{dept === 'all' ? 'All Depts' : dept}</button>
          ))}
        </div>
      </motion.div>

      {/* ── Main layout — stacked on mobile, side-by-side on lg when form open ── */}
      <div className={showForm ? 'flex flex-col lg:flex-row gap-6' : ''}>

        {/* ── Employee cards ── */}
        <div className={`${showForm ? 'lg:w-1/2' : 'w-full'} space-y-4`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-3">
                <Users size={24} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-500 dark:text-gray-400">No employees yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "+ Add Employee" to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {filtered.map((emp, i) => {
                  const name   = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                  const dept   = emp.department_name || emp.department || '—'
                  const status = emp.status || 'active'
                  const mode   = emp.work_mode || emp.workMode || '—'
                  const joined = emp.join_date || emp.joinDate
                  const empId  = emp.employee_id || emp.id
                  const pct    = emp.profile_completion ?? emp.profileCompletion ?? 0
                  return (
                    <div
                      key={emp.id}
                      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-md p-4 sm:p-5"
                    >
                      {/* Top row */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar name={name} src={emp.avatar_url} size="lg" online={status === 'active'} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">{name}</p>
                          <p className="text-xs text-gray-400 truncate">{emp.designation || '—'}</p>
                          <p className="text-xs text-gray-400 truncate">{dept}</p>
                          <Badge label={status} color={getStatusColor(status)} dot className="mt-1" />
                        </div>
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0">{empId}</span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <div className="flex justify-between items-center">
                          <span>Mode</span>
                          <Badge label={mode} color="bg-primary-500/10 text-primary-500" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Joined</span>
                          <span className="text-gray-700 dark:text-gray-300">{formatDate(joined)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Profile</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{pct}%</span>
                        </div>
                      </div>

                      <ProgressBar value={pct} size="sm" />

                      {/* Edit / Delete buttons — plain buttons, no motion, no stopPropagation */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-dark-600">
                        <button
                          type="button"
                          onClick={() => handleEdit(emp)}
                          style={{ cursor: 'pointer' }}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white transition-colors"
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteEmp(emp)}
                          style={{ cursor: 'pointer' }}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* ── Add / Edit Form ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="lg:w-1/2 w-full"
            >
              <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-xl overflow-hidden">
                {/* Form header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-dark-600">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      {editEmp ? 'Edit Employee' : 'Add Employee'}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {editEmp ? `Editing: ${editEmp.first_name || editEmp.name}` : 'Fill in the employee details below'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); setCredentials(null); setEditEmp(null); setForm(EMPTY_FORM) }}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {credentials ? (
                    /* ── Credentials shown after create ── */
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                        <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                          Employee created! Share these credentials.
                        </p>
                      </div>
                      {[
                        { label: 'Username', value: credentials.username },
                        { label: 'Password', value: credentials.password },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                          <div>
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="font-mono font-semibold text-gray-900 dark:text-white text-sm">{value}</p>
                          </div>
                          <button onClick={() => handleCopy(label, value)}
                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-500 transition-colors">
                            {copied[label] ? <CheckCircle size={15} className="text-green-500" /> : <Copy size={15} className="text-gray-400" />}
                          </button>
                        </div>
                      ))}
                      <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          ⚠️ Save these now. Password cannot be retrieved later.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="ghost" onClick={() => { setCredentials(null); setForm(EMPTY_FORM) }}>
                          Add Another
                        </Button>
                        <Button onClick={() => { setShowForm(false); setCredentials(null) }}>
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Profile Name */}
                      <Input label="Profile Name *" placeholder="Full name e.g. John Doe"
                        value={form.profile_name} onChange={e => setF('profile_name', e.target.value)} />

                      {/* Credentials — only for new employee */}
                      {!editEmp && (
                        <div className="border-t border-gray-100 dark:border-dark-600 pt-4 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Login Credentials
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input label="Username *" placeholder="e.g. john.doe"
                              value={form.username}
                              onChange={e => setF('username', e.target.value.toLowerCase().replace(/\s+/g,''))} />
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                              <div className="relative">
                                <input
                                  type={showPass ? 'text' : 'password'}
                                  value={form.password}
                                  onChange={e => setF('password', e.target.value)}
                                  placeholder="Min 6 characters"
                                  className="w-full px-4 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <button type="button" onClick={() => setShowPass(s => !s)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                                </button>
                              </div>
                              {form.password.length > 0 && (() => {
                                const p = form.password
                                const score = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[!@#$%^&*]/.test(p)].filter(Boolean).length
                                const colors = ['bg-red-400','bg-orange-400','bg-yellow-400','bg-green-400','bg-green-500']
                                const labels = ['Weak','Fair','Good','Strong','Very Strong']
                                return (
                                  <div className="mt-1.5">
                                    <div className="flex gap-1 mb-1">
                                      {[0,1,2,3].map(i => (
                                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score] : 'bg-gray-200 dark:bg-dark-600'}`} />
                                      ))}
                                    </div>
                                    <p className={`text-xs ${score < 2 ? 'text-red-500' : score < 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                                      {labels[score]} {score < 3 ? '— add uppercase, numbers, symbols' : '✓'}
                                    </p>
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                            <KeyRound size={13} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-700 dark:text-yellow-400">
                              Share these credentials with the employee for first login.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button variant="ghost"
                          onClick={() => { setShowForm(false); setEditEmp(null); setForm(EMPTY_FORM) }}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                          {saving
                            ? <><motion.div animate={{ rotate: 360 }}
                                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                {editEmp ? 'Saving…' : 'Creating…'}</>
                            : editEmp ? 'Save Changes' : <><Plus size={14} /> Add Employee</>
                          }
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteEmp && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeleteEmp(null)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-white dark:bg-dark-800 w-full sm:max-w-sm
                         rounded-t-3xl sm:rounded-2xl shadow-2xl
                         border border-gray-100 dark:border-dark-600 p-6"
            >
              {/* Drag handle on mobile */}
              <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mb-4 sm:hidden" />

              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-500" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete Employee?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete <strong className="text-gray-800 dark:text-gray-200">{deleteEmp.first_name || deleteEmp.name}</strong>?
                  This will remove their login account too. This cannot be undone.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button variant="ghost" onClick={() => setDeleteEmp(null)}>
                  Cancel
                </Button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                             text-white bg-red-500 hover:bg-red-600 active:scale-95
                             disabled:opacity-60 transition-all touch-manipulation"
                >
                  {deleting
                    ? <><motion.div animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Deleting…</>
                    : <><Trash2 size={15} /> Delete</>
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EmployeeManagement
