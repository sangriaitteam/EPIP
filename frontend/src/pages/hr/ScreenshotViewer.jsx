import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Lock, Clock, Users, Eye, RefreshCw, X } from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import StatCard from '../../components/common/StatCard'
import { api } from '../../services/api'
import { employeeService } from '../../services/employeeService'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const ScreenshotViewer = () => {
  const today = new Date().toISOString().split('T')[0]

  const [employees,        setEmployees]        = useState([])
  const [selectedEmp,      setSelectedEmp]      = useState(null)
  const [selectedDate,     setSelectedDate]     = useState(today)
  const [screenshots,      setScreenshots]      = useState([])
  const [allShots,         setAllShots]         = useState([])
  const [preview,          setPreview]          = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [refreshing,       setRefreshing]       = useState(false)
  const [interval,         setInterval_]        = useState(10)

  // Load employees + settings
  useEffect(() => {
    employeeService.getAll().then(d => {
      if (d?.length) {
        setEmployees(d)
        setSelectedEmp(d[0])
      }
    }).catch(() => {})

    api.get('/admin/settings').then(res => {
      const iv = parseInt(res.data?.screenshot_interval_minutes || res.data?.screenshot_interval || 10)
      setInterval_(iv)
    }).catch(() => {})
  }, [])

  // Load all screenshots for today count
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get(`/screenshots?date=${selectedDate}&limit=200`)
      if (res.success) setAllShots(res.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }, [selectedDate])

  // Load screenshots for selected employee
  const loadForEmployee = useCallback(async () => {
    if (!selectedEmp) return
    try {
      const res = await api.get(`/screenshots/employee/${selectedEmp.id}?date=${selectedDate}&limit=50`)
      if (res.success) setScreenshots(res.data || [])
    } catch { setScreenshots([]) }
  }, [selectedEmp, selectedDate])

  useEffect(() => {
    loadAll()
  }, [selectedDate])

  useEffect(() => {
    loadForEmployee()
  }, [selectedEmp, selectedDate])

  // Count for each employee today
  const countFor = (empId) => allShots.filter(s => s.employee_id === empId).length

  // Total today
  const totalToday = allShots.length
  const monitored  = employees.filter(e => countFor(e.id) > 0).length

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Screenshot Viewer</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Auto-captured every {interval} min during work hours
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Lock size={13} className="text-yellow-600" />
            <span className="text-xs text-yellow-600 font-medium">HR access only</span>
          </div>
          <button onClick={() => { loadAll(true); loadForEmployee() }} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Today's Captures" value={totalToday}         subtitle="All employees" icon={Camera} color="primary" delay={0.1} />
        <StatCard title="Interval"         value={`${interval} min`} subtitle="Per employee"  icon={Clock}  color="blue"    delay={0.2} />
        <StatCard title="Active Today"     value={monitored}          subtitle="Employees"     icon={Users}  color="green"   delay={0.3} />
        <StatCard title="Selected"         value={screenshots.length} subtitle="This view"    icon={Eye}    color="purple"  delay={0.4} />
      </motion.div>

      {/* Date picker */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</label>
        <input type="date" value={selectedDate} max={today}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </motion.div>

      {/* Main layout */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Employee list */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Employees</h3>
          </CardHeader>
          <CardBody className="p-2 space-y-1">
            {employees.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No employees</p>
            ) : employees.map((emp, i) => {
              const name  = emp.name || `${emp.first_name||''} ${emp.last_name||''}`.trim()
              const count = countFor(emp.id)
              const isSelected = selectedEmp?.id === emp.id
              return (
                <button key={emp.id} onClick={() => setSelectedEmp(emp)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                    isSelected ? 'bg-primary-500/10 border border-primary-500/20' : 'hover:bg-gray-50 dark:hover:bg-dark-700'
                  }`}>
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.designation || emp.department || '—'}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${count > 0 ? 'text-primary-500' : 'text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </CardBody>
        </Card>

        {/* Screenshots panel */}
        <div className="lg:col-span-3 space-y-4">

          {/* Selected employee info */}
          {selectedEmp && (
            <Card animate={false}>
              <CardBody className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={selectedEmp.name || `${selectedEmp.first_name||''} ${selectedEmp.last_name||''}`} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedEmp.name || `${selectedEmp.first_name||''} ${selectedEmp.last_name||''}`.trim()}
                    </p>
                    <p className="text-xs text-gray-400">{selectedEmp.designation || '—'} · {selectedEmp.employee_id || selectedEmp.id}</p>
                  </div>
                  <span className="text-sm font-bold text-primary-500">{screenshots.length} shots</span>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Screenshot grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-600">
              <Camera size={32} className="text-gray-300 dark:text-dark-500 mb-3" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No screenshots yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Employee needs to be logged in — captures start automatically every {interval} min
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {screenshots.map((shot, i) => (
                  <motion.div key={shot.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{    opacity: 0, scale: 0.85 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 150 }}
                    onClick={() => setPreview(shot)}
                    className="group relative aspect-video bg-gray-100 dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 overflow-hidden cursor-pointer hover:border-primary-500 transition-colors hover:shadow-lg"
                  >
                    {/* Real screenshot image */}
                    {shot.file_url ? (
                      <img
                        src={shot.file_url}
                        alt={`Screenshot ${fmtTime(shot.captured_at || shot.created_at)}`}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera size={20} className="text-gray-400" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                        <Eye size={16} className="text-white" />
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-[10px] text-white/90 font-mono">
                        {fmtTime(shot.captured_at || shot.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPreview(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 w-full max-w-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-dark-600">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {selectedEmp?.name || `${selectedEmp?.first_name||''} ${selectedEmp?.last_name||''}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {fmtDate(preview.captured_at || preview.created_at)} · {fmtTime(preview.captured_at || preview.created_at)}
                  </p>
                </div>
                <button onClick={() => setPreview(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-black">
                {preview.file_url
                  ? <img src={preview.file_url} alt="Screenshot" className="w-full max-h-[70vh] object-contain" />
                  : <div className="flex items-center justify-center h-64">
                      <Camera size={40} className="text-gray-600" />
                    </div>
                }
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default ScreenshotViewer
