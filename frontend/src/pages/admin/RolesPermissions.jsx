import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Check, X, Plus, UserPlus, Eye, EyeOff,
  CheckCircle, Users, LogIn, LogOut, Clock, RefreshCw,
  UserCheck, UserX, Trash2
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import { api } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const ROLES = [
  { name: 'Admin',          color: 'bg-purple-500', glow: 'shadow-purple-500/30', desc: 'Full system access' },
  { name: 'Project Manager',color: 'bg-blue-500',   glow: 'shadow-blue-500/30',   desc: 'Project oversight & team management' },
  { name: 'Employee',       color: 'bg-gray-500',   glow: 'shadow-gray-500/20',   desc: 'Own data & self-assessment' },
]

const PERMISSIONS = [
  { module: 'Employee Management', admin: true,  employee: false },
  { module: 'Attendance View',     admin: true,  employee: true  },
  { module: 'Attendance Edit',     admin: true,  employee: true  },
  { module: 'Task Management',     admin: true,  employee: true  },
  { module: 'Goal Management',     admin: true,  employee: true  },
  { module: 'Performance Review',  admin: true,  employee: false },
  { module: 'Self Assessment',     admin: true,  employee: true  },
  { module: 'Reports Export',      admin: true,  employee: false },
  { module: 'Screenshot Viewer',   admin: true,  employee: false },
  { module: 'Admin Settings',      admin: true,  employee: false },
  { module: 'Departments',         admin: true,  employee: false },
]

const Tick = ({ allowed }) => (
  <motion.span
    whileHover={{ scale: 1.2 }}
    className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
      allowed ? 'bg-green-500/10' : 'bg-red-500/10'
    }`}
  >
    {allowed
      ? <Check size={12} className="text-green-500" />
      : <X     size={12} className="text-red-400" />
    }
  </motion.span>
)

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const AdminRolesPermissions = () => {
  const navigate = useNavigate()
  const [showModal,      setShowModal]      = useState(false)
  const [showEmpPanel,   setShowEmpPanel]   = useState(false)
  const [form,           setForm]           = useState({ name: '', username: '', password: '' })
  const [showPass,       setShowPass]       = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [done,           setDone]           = useState(false)
  const [attendance,     setAttendance]     = useState([])
  const [attLoading,     setAttLoading]     = useState(false)
  const [attRefreshing,  setAttRefreshing]  = useState(false)
  // Admin list
  const [admins,         setAdmins]         = useState([])
  const [deactivating,   setDeactivating]   = useState(null)
  const [deleting,       setDeleting]       = useState(null)

  // Project Manager modal
  const [showPMModal,    setShowPMModal]    = useState(false)
  const [pmForm,         setPmForm]         = useState({ name: '', username: '', password: '' })
  const [showPMPass,     setShowPMPass]     = useState(false)
  const [pmSaving,       setPmSaving]       = useState(false)
  const [pmDone,         setPmDone]         = useState(false)
  const [projectManagers,setProjectManagers]= useState([])
  const [deletingPM,     setDeletingPM]     = useState(null)

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadAttendance = async (silent = false) => {
    if (!silent) setAttLoading(true)
    else setAttRefreshing(true)
    try {
      const res = await api.get('/attendance/today-all')
      if (res.success) setAttendance(res.data || [])
    } catch {}
    setAttLoading(false)
    setAttRefreshing(false)
  }

  const handleEmpCardClick = () => {
    setShowEmpPanel(true)
    loadAttendance()
  }

  const loadAdmins = async () => {
    try {
      const res = await api.get('/admin/admins')
      if (res.success) setAdmins(res.data || [])
    } catch {}
  }

  const loadProjectManagers = async () => {
    try {
      const res = await api.get('/admin/project-managers')
      if (res.success) setProjectManagers(res.data || [])
    } catch {}
  }

  const handleDeactivate = async (adminId, adminName) => {
    if (!window.confirm(`Deactivate "${adminName}"? They will lose access immediately.`)) return
    setDeactivating(adminId)
    try {
      const res = await api.patch(`/admin/users/${adminId}/deactivate`)
      if (res.success) {
        toast.success(`${adminName} deactivated`)
        loadAdmins()
      } else { toast.error(res.message || 'Failed') }
    } catch { toast.error('Cannot connect to server') }
    setDeactivating(null)
  }

  // Load admins + project managers on mount
  useEffect(() => { loadAdmins(); loadProjectManagers() }, [])

  const handleDeletePM = async (pmId, pmName) => {
    if (!window.confirm(`Delete "${pmName}" permanently? This cannot be undone.`)) return
    setDeletingPM(pmId)
    try {
      const res = await api.delete(`/admin/project-managers/${pmId}`)
      if (res.success) {
        toast.success(`🗑 ${pmName} permanently deleted`)
        loadProjectManagers()
      } else { toast.error(res.message || 'Delete failed') }
    } catch { toast.error('Cannot connect to server') }
    setDeletingPM(null)
  }

  const handleCreatePM = async () => {
    if (!pmForm.name.trim())     { toast.error('Name is required'); return }
    if (!pmForm.username.trim()) { toast.error('Username is required'); return }
    const pwd = pmForm.password
    if (pwd.length < 8)            { toast.error('Password must be at least 8 characters'); return }
    if (!/[A-Z]/.test(pwd))        { toast.error('Password must contain at least one uppercase letter'); return }
    if (!/[0-9]/.test(pwd))        { toast.error('Password must contain at least one number'); return }
    if (!/[!@#$%^&*]/.test(pwd))   { toast.error('Password must contain at least one special character (!@#$%^&*)'); return }
    setPmSaving(true)
    const res = await api.post('/admin/create-project-manager', pmForm)
    setPmSaving(false)
    if (res.success) {
      setPmDone(true)
      toast.success('Project Manager created!')
      loadProjectManagers()
    } else {
      toast.error(res.message || 'Failed to create project manager')
    }
  }

  const handleClosePM = () => {
    setShowPMModal(false)
    setPmDone(false)
    setPmForm({ name: '', username: '', password: '' })
  }

  const handleDelete = async (adminId, adminName) => {
    if (!window.confirm(`⚠️ Permanently delete "${adminName}"?\n\nThis will delete their account, profile and all related data. This cannot be undone.`)) return
    setDeleting(adminId)
    try {
      const res = await api.delete(`/admin/admins/${adminId}`)
      if (res.success) {
        toast.success(`🗑 ${adminName} permanently deleted`)
        loadAdmins()
      } else { toast.error(res.message || 'Delete failed') }
    } catch { toast.error('Cannot connect to server') }
    setDeleting(null)
  }
  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const present  = attendance.filter(r => r.check_in).length
  const inOffice = attendance.filter(r => r.check_in && !r.check_out).length
  const absent   = attendance.filter(r => !r.check_in).length

  const handleCreate = async () => {
    if (!form.name.trim())     { toast.error('Name is required');     return }
    if (!form.username.trim()) { toast.error('Username is required'); return }

    // Strong password validation
    const pwd = form.password
    if (pwd.length < 8)            { toast.error('Password must be at least 8 characters');           return }
    if (!/[A-Z]/.test(pwd))        { toast.error('Password must contain at least one uppercase letter'); return }
    if (!/[0-9]/.test(pwd))        { toast.error('Password must contain at least one number');           return }
    if (!/[!@#$%^&*]/.test(pwd))   { toast.error('Password must contain at least one special character (!@#$%^&*)'); return }

    setSaving(true)
    const res = await api.post('/admin/create-admin', form)
    setSaving(false)
    if (res.success) {
      setDone(true)
      toast.success('Admin created!')
      loadAdmins()
    } else {
      toast.error(res.message || 'Failed to create admin')
    }
  }

  const handleClose = () => {
    setShowModal(false)
    setDone(false)
    setForm({ name: '', username: '', password: '' })
  }

  return (
  <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

    {/* Header */}
    <motion.div variants={fadeUp} className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage role-based access control</p>
      </div>
    </motion.div>

    {/* Role cards */}
    <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {ROLES.map((role, i) => (
        <motion.div
          key={role.name}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 130 }}
          whileHover={{ y: -6, scale: 1.03 }}
          onClick={() => {
            if (role.name === 'Admin')           setShowModal(true)
            if (role.name === 'Project Manager') setShowPMModal(true)
            if (role.name === 'Employee')        handleEmpCardClick()
          }}
          className={`p-4 rounded-2xl border border-gray-100 dark:border-dark-600 bg-white dark:bg-dark-800 shadow-lg ${role.glow} cursor-pointer`}
        >
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className={`w-10 h-10 rounded-xl ${role.color} flex items-center justify-center mb-3 shadow-lg ${role.glow}`}
          >
            {role.name === 'Employee' ? <Users size={18} className="text-white" /> : <Shield size={18} className="text-white" />}
          </motion.div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{role.desc}</p>
          {role.name === 'Admin' && (
            <p className="text-xs text-primary-500 mt-1 font-medium">Click to add Admin →</p>
          )}
          {role.name === 'Project Manager' && (
            <p className="text-xs text-blue-500 mt-1 font-medium">Click to add Project Manager →</p>
          )}
          {role.name === 'Employee' && (
            <p className="text-xs text-green-500 mt-1 font-medium">Click to view attendance →</p>
          )}
        </motion.div>
      ))}
    </motion.div>

    {/* ── Employee Attendance Panel ── */}
    <AnimatePresence>
      {showEmpPanel && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Clock size={16} className="text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Today's Employee Attendance
                    </h3>
                    <p className="text-xs text-gray-400">
                      {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini stats */}
                  <div className="flex gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {present} present
                    </span>
                    <span className="flex items-center gap-1 text-blue-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" /> {inOffice} in office
                    </span>
                    <span className="flex items-center gap-1 text-red-500 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {absent} absent
                    </span>
                  </div>
                  <button
                    onClick={() => loadAttendance(true)}
                    disabled={attRefreshing}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors"
                  >
                    <motion.div
                      animate={attRefreshing ? { rotate: 360 } : {}}
                      transition={{ duration: 0.8, repeat: attRefreshing ? Infinity : 0, ease: 'linear' }}
                    >
                      <RefreshCw size={13} />
                    </motion.div>
                  </button>
                  <button
                    onClick={() => setShowEmpPanel(false)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {attLoading ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : attendance.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No employee records found</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                          {['Employee', 'Department', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                        {attendance.map((row, i) => {
                          const name  = `${row.first_name} ${row.last_name}`
                          const isIn  = !!(row.check_in && !row.check_out)
                          return (
                            <motion.tr key={row.employee_id}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                              className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <Avatar name={name} size="sm" online={isIn} />
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{name}</p>
                                    <p className="text-xs text-gray-400">{row.emp_code}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{row.department || '—'}</td>
                              <td className="px-4 py-2.5">
                                <span className={`font-semibold text-sm flex items-center gap-1 ${row.check_in ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                  {row.check_in && <LogIn size={12} />}
                                  {fmtTime(row.check_in)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`font-semibold text-sm flex items-center gap-1 ${row.check_out ? 'text-red-500' : 'text-gray-400'}`}>
                                  {row.check_out && <LogOut size={12} />}
                                  {row.check_out ? fmtTime(row.check_out)
                                    : isIn ? <span className="text-xs text-green-500 animate-pulse">In office</span>
                                    : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                                {row.hours_worked ? `${row.hours_worked}h` : '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                {!row.check_in
                                  ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500">Absent</span>
                                  : isIn
                                  ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400">In Office</span>
                                  : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500">Done</span>
                                }
                                {row.is_late && <span className="ml-1.5 text-xs text-orange-500">· Late</span>}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-gray-100 dark:divide-dark-700">
                    {attendance.map((row) => {
                      const name = `${row.first_name} ${row.last_name}`
                      const isIn = !!(row.check_in && !row.check_out)
                      return (
                        <div key={row.employee_id} className="flex items-center gap-3 px-4 py-3">
                          <Avatar name={name} size="sm" online={isIn} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{name}</p>
                            <p className="text-xs text-gray-400">{row.emp_code} · {row.department || '—'}</p>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5">
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
                              <LogIn size={11} /> {fmtTime(row.check_in)}
                            </p>
                            <p className="text-xs text-red-500 flex items-center gap-1 justify-end">
                              <LogOut size={11} />
                              {row.check_out ? fmtTime(row.check_out) : isIn ? <span className="text-green-500 animate-pulse">In office</span> : 'Absent'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-gray-400 text-center py-2.5 border-t border-gray-100 dark:border-dark-600">
                    {attendance.length} employees · Showing today's attendance
                  </p>
                </>
              )}
            </CardBody>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Admin Accounts List ── */}
    <motion.div variants={fadeUp}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <UserCheck size={16} className="text-primary-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Admin Accounts</h3>
                <p className="text-xs text-gray-400">
                  {admins.filter(a => a.is_active).length}/5 active · Click "Admin" card above to add new
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400">
              Max 5
            </span>
          </div>
        </CardHeader>
        <CardBody>
          {admins.length === 0 ? (
            <div className="py-8 text-center">
              <UserCheck size={28} className="mx-auto text-gray-300 dark:text-dark-500 mb-2" />
              <p className="text-sm text-gray-400">No admins yet — click the Admin card above to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map((admin, i) => (
                <motion.div key={admin.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={admin.name} size="sm" online={admin.is_active} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{admin.name}</p>
                      <p className="text-xs text-gray-400 font-mono">@{admin.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {admin.is_first_login && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/15 text-yellow-600 dark:text-yellow-400">
                        Pending setup
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      admin.is_active
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {admin.is_active && (
                      <motion.button
                        onClick={() => handleDeactivate(admin.id, admin.name)}
                        disabled={deactivating === admin.id}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        title="Deactivate admin"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-orange-500 transition-colors disabled:opacity-50">
                        {deactivating === admin.id
                          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                              className="w-3.5 h-3.5 border-2 border-orange-500/30 border-t-orange-500 rounded-full" />
                          : <UserX size={13} />
                        }
                      </motion.button>
                    )}
                    {/* Delete — permanently remove admin */}
                    <motion.button
                      onClick={() => handleDelete(admin.id, admin.name)}
                      disabled={deleting === admin.id}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      title="Delete permanently"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                      {deleting === admin.id
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                            className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full" />
                        : <Trash2 size={13} />
                      }
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>

    {/* Permission matrix */}
    <motion.div variants={fadeUp}>
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Permission Matrix</h3>
          <p className="text-xs text-gray-400 mt-0.5">Access control per module and role</p>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Module</th>
                {ROLES.map(r => (
                  <th key={r.name} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
              {PERMISSIONS.map((perm, i) => (
                <motion.tr key={perm.module} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-sm">{perm.module}</td>
                  <td className="px-4 py-3 text-center"><Tick allowed={perm.admin} /></td>
                  <td className="px-4 py-3 text-center"><Tick allowed={perm.employee} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </motion.div>

    {/* ── Project Manager Accounts List ── */}
    <motion.div variants={fadeUp}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <UserCheck size={16} className="text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Project Manager Accounts</h3>
                <p className="text-xs text-gray-400">
                  {projectManagers.filter(p => p.is_active).length}/2 active · Click "Project Manager" card above to add new
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Max 2
            </span>
          </div>
        </CardHeader>
        <CardBody>
          {projectManagers.length === 0 ? (
            <div className="py-8 text-center">
              <UserCheck size={28} className="mx-auto text-gray-300 dark:text-dark-500 mb-2" />
              <p className="text-sm text-gray-400">No project managers yet — click the Project Manager card above to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projectManagers.map((pm, i) => (
                <motion.div key={pm.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={pm.name} size="sm" online={pm.is_active} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{pm.name}</p>
                      <p className="text-xs text-gray-400 font-mono">@{pm.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pm.is_active
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {pm.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <motion.button
                      onClick={() => handleDeletePM(pm.id, pm.name)}
                      disabled={deletingPM === pm.id}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      title="Delete permanently"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
                      {deletingPM === pm.id
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                            className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full" />
                        : <Trash2 size={13} />
                      }
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>

    {/* ── Add Admin Modal ── */}
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1,   opacity: 1, y: 0  }}
            exit={{    scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-md p-6"
          >
            {done ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Admin Created!</p>
                <p className="text-sm text-gray-400">Admin can now login with the credentials you set.</p>
                <button onClick={handleClose}
                  className="mt-2 px-6 py-2 rounded-xl bg-primary-500 text-white text-sm font-medium">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                    <UserPlus size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Create Admin Account</h2>
                    <p className="text-xs text-gray-400">Up to 5 Admins allowed</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">Full Name *</label>
                    <input value={form.name} onChange={e => setF('name', e.target.value)}
                      placeholder="Admin's full name"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">Username *</label>
                    <input value={form.username} onChange={e => setF('username', e.target.value.toLowerCase().replace(/\s+/g,''))}
                      placeholder="e.g. admin.john"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">Password *</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setF('password', e.target.value)}
                        placeholder="Min 8 chars, uppercase, number, symbol"
                        className="w-full px-4 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                      <button type="button" onClick={() => setShowPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                    {/* Password strength indicators */}
                    {form.password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {[
                          { label: 'At least 8 characters',       ok: form.password.length >= 8 },
                          { label: 'Uppercase letter (A-Z)',       ok: /[A-Z]/.test(form.password) },
                          { label: 'Number (0-9)',                 ok: /[0-9]/.test(form.password) },
                          { label: 'Special character (!@#$%^&*)', ok: /[!@#$%^&*]/.test(form.password) },
                        ].map(({ label, ok }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            {ok
                              ? <Check size={11} className="text-green-500 flex-shrink-0" />
                              : <X     size={11} className="text-red-400 flex-shrink-0" />
                            }
                            <span className={`text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={handleClose}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700">
                    Cancel
                  </button>
                  <motion.button onClick={handleCreate} disabled={saving}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white text-sm font-semibold disabled:opacity-60">
                    {saving
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      : <><UserPlus size={14}/> Create Admin</>
                    }
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ── Add Project Manager Modal ── */}
    <AnimatePresence>
      {showPMModal && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && handleClosePM()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1,   opacity: 1, y: 0  }}
            exit={{    scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-md p-6"
          >
            {pmDone ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">Project Manager Created!</p>
                <p className="text-sm text-gray-400">They can now login with the credentials you set.</p>
                <button onClick={handleClosePM}
                  className="mt-2 px-6 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <UserPlus size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Create Project Manager</h2>
                    <p className="text-xs text-gray-400">Up to 2 Project Managers allowed</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">Full Name *</label>
                    <input value={pmForm.name} onChange={e => setPmForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Project Manager's full name"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">Username *</label>
                    <input value={pmForm.username} onChange={e => setPmForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g,'') }))}
                      placeholder="e.g. pm.john"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1.5">Password *</label>
                    <div className="relative">
                      <input type={showPMPass ? 'text' : 'password'} value={pmForm.password} onChange={e => setPmForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="Min 8 chars, uppercase, number, symbol"
                        className="w-full px-4 py-2.5 pr-10 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" onClick={() => setShowPMPass(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPMPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                    {pmForm.password.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {[
                          { label: 'At least 8 characters',       ok: pmForm.password.length >= 8 },
                          { label: 'Uppercase letter (A-Z)',       ok: /[A-Z]/.test(pmForm.password) },
                          { label: 'Number (0-9)',                 ok: /[0-9]/.test(pmForm.password) },
                          { label: 'Special character (!@#$%^&*)', ok: /[!@#$%^&*]/.test(pmForm.password) },
                        ].map(({ label, ok }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            {ok ? <Check size={11} className="text-green-500 flex-shrink-0" /> : <X size={11} className="text-red-400 flex-shrink-0" />}
                            <span className={`text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={handleClosePM}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dark-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700">
                    Cancel
                  </button>
                  <motion.button onClick={handleCreatePM} disabled={pmSaving}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold disabled:opacity-60">
                    {pmSaving
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      : <><UserPlus size={14}/> Create PM</>
                    }
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

  </motion.div>
  )
}

export default AdminRolesPermissions
