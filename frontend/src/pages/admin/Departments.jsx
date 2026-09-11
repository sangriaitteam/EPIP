import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, Users, Building2, X, CheckCircle } from 'lucide-react'
import { adminService } from '../../services/adminService'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const DEPT_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#84cc16']

const inputCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

// ── Add/Edit Modal ─────────────────────────────────────────────────────────
const DeptFormModal = ({ dept, onClose, onSaved }) => {
  const [form,   setForm]   = useState({ name: dept?.name||'', color: dept?.color||'#6366f1' })
  const [saving, setSaving] = useState(false)
  const setF = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Department name is required'); return }
    setSaving(true)
    try {
      const res = dept
        ? await api.put(`/admin/departments/${dept.id}`, form)
        : await api.post('/admin/departments', form)
      if (res.success) {
        toast.success(dept ? 'Department updated!' : 'Department created!')
        onSaved()
        onClose()
      } else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{y:'100%',opacity:0}} animate={{y:0,opacity:1}} exit={{y:'100%',opacity:0}}
        transition={{type:'spring',stiffness:280,damping:28}}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6">
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mb-4 sm:hidden"/>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{dept ? 'Edit Department' : 'Add Department'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400"><X size={16}/></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Department Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="e.g. Marketing" className={inputCls} autoFocus/>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
            <div className="flex flex-wrap gap-2">
              {DEPT_COLORS.map(c => (
                <button key={c} type="button" onClick={()=>setF('color',c)}
                  className={`w-8 h-8 rounded-full border-4 transition-all ${form.color===c?'border-gray-800 dark:border-white scale-110':'border-transparent hover:scale-105'}`}
                  style={{backgroundColor:c}}/>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose} className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">Cancel</button>
          <motion.button onClick={handleSave} disabled={saving} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            className="py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving?<><motion.div animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:'linear'}} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Saving…</>:<><CheckCircle size={15}/>{dept?'Save':'Add Department'}</>}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
const AdminDepartments = () => {
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editDept,    setEditDept]    = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const d = await adminService.getDepartments()
      if (d?.length) setDepartments(d)
      else setDepartments([])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/admin/departments/${id}`)
      if (res.success) {
        setDepartments(prev => prev.filter(d => d.id !== id))
        toast.success('Department deleted')
      } else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect to server') }
    setDeleteId(null)
  }

  // Use real field names — employee_count (from DB), head_name
  const totalEmployees = departments.reduce((s, d) => s + (d.employee_count || d.employees || 0), 0)

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Departments</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Loading...' : `${departments.length} departments · ${totalEmployees} total employees`}
          </p>
        </div>
        <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}}
          onClick={()=>{setEditDept(null);setShowForm(true)}}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 shadow-md shadow-primary-500/25 transition-colors">
          <Plus size={16}/> Add Department
        </motion.button>
      </motion.div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full"/>
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
          <Building2 size={36} className="text-gray-300 dark:text-dark-500 mb-3"/>
          <p className="font-medium text-gray-500 dark:text-gray-400">No departments yet</p>
          <button onClick={()=>setShowForm(true)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors">
            <Plus size={14}/> Add Department
          </button>
        </div>
      ) : (
        /* Department cards grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {departments.map((dept, i) => {
            // Support both real API fields and mockData fields
            const empCount    = dept.employee_count ?? dept.employees ?? 0
            const headName    = dept.head_name || dept.head || '—'
            const color       = dept.color || '#6366f1'
            const sharePercent = totalEmployees > 0
              ? Math.round((empCount / totalEmployees) * 100)
              : 0

            return (
              <motion.div key={dept.id}
                initial={{opacity:0, y:20, scale:0.93}}
                animate={{opacity:1, y:0,  scale:1}}
                transition={{delay: i*0.07, type:'spring', stiffness:130, damping:14}}
                whileHover={{y:-4, scale:1.01}}
                className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-md hover:shadow-xl transition-all p-5"
              >
                <div className="flex items-start gap-3 mb-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{backgroundColor: color + '20'}}>
                    <Building2 size={20} style={{color}}/>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">{dept.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Head: <span className="text-gray-600 dark:text-gray-300">{headName}</span>
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users size={12} className="text-gray-400"/>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{empCount}</span>
                      <span className="text-xs text-gray-400">employees</span>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={()=>{setEditDept(dept);setShowForm(true)}}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-400 hover:text-primary-500 transition-colors">
                      <Edit2 size={14}/>
                    </button>
                    <button onClick={()=>setDeleteId(dept.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>

                {/* Progress bar — company share */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-400">Company share</span>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{sharePercent}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                    <motion.div
                      initial={{width:0}}
                      animate={{width:`${sharePercent}%`}}
                      transition={{duration:1, delay:0.3+i*0.07, ease:[0.34,1.56,0.64,1]}}
                      className="h-full rounded-full"
                      style={{backgroundColor: color}}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <DeptFormModal
            dept={editDept}
            onClose={()=>{setShowForm(false);setEditDept(null)}}
            onSaved={()=>{setEditDept(null);load()}}
          />
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Department?</h3>
              <p className="text-sm text-gray-400 mb-5">This will remove the department. Employees in this department will be unassigned.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setDeleteId(null)} className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">Cancel</button>
                <button onClick={()=>handleDelete(deleteId)} className="py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default AdminDepartments
