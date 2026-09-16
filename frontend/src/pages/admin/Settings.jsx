import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Bell, Camera, Clock, Plus, X, CheckCircle, Edit2, Trash2 } from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import { adminService } from '../../services/adminService'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Toggle ─────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, hint }) => (
  <div className="flex items-start justify-between py-3 border-b border-gray-100 dark:border-dark-600 last:border-0 gap-4">
    <div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
    <motion.button onClick={() => onChange(!checked)} whileTap={{ scale: 0.95 }}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-dark-500'
      }`}>
      <motion.span animate={{ x: checked ? 20 : 0 }} transition={{ type:'spring', stiffness:400, damping:25 }}
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow" />
    </motion.button>
  </div>
)

const inputCls = `w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
  bg-white dark:bg-dark-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all`

const TABS = [
  { key: 'general',       label: 'General',       icon: Settings },
  { key: 'screenshot',    label: 'Screenshot',    icon: Camera   },
  { key: 'shifts',        label: 'Shifts',        icon: Clock    },
  { key: 'notifications', label: 'Notifications', icon: Bell     },
]

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type:'spring', stiffness:120, damping:14 } } }

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general')

  // ── General ──────────────────────────────────────────────────────────────
  const [general,        setGeneral]        = useState({ company_name: '', company_email: '' })
  const [savingGeneral,  setSavingGeneral]  = useState(false)
  const [loadingGeneral, setLoadingGeneral] = useState(true)

  // ── Screenshot ────────────────────────────────────────────────────────────
  const [ssInterval,     setSsInterval]     = useState(10)
  const [ssEnabled,      setSsEnabled]      = useState(true)
  const [savingSSs,      setSavingSS]       = useState(false)

  // ── Shifts ────────────────────────────────────────────────────────────────
  const [shifts,         setShifts]         = useState([])
  const [loadingShifts,  setLoadingShifts]  = useState(true)
  const [showShiftForm,  setShowShiftForm]  = useState(false)
  const [editShift,      setEditShift]      = useState(null)
  const [shiftForm,      setShiftForm]      = useState({ name:'', start_time:'09:00', end_time:'18:00', days:'Mon-Fri' })
  const [savingShift,    setSavingShift]    = useState(false)

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notif,          setNotif]          = useState({ review_reminders:true, task_deadlines:true, approval_alerts:true, system_alerts:false })
  const [savingNotif,    setSavingNotif]    = useState(false)

  // Load all settings on mount
  useEffect(() => {
    loadSettings()
    loadShifts()
  }, [])

  const loadSettings = async () => {
    setLoadingGeneral(true)
    try {
      const d = await adminService.getSettings()
      if (d) {
        setGeneral({
          company_name:  d.company_name  || 'Sangria Edutainment Pvt Ltd',
          company_email: d.company_email || '',
        })
        setSsInterval(parseInt(d.screenshot_interval || d.screenshot_interval_minutes || 10))
        setSsEnabled(d.screenshot_enabled !== 'false')
        setNotif({
          review_reminders: d.review_reminders !== 'false',
          task_deadlines:   d.task_deadlines   !== 'false',
          approval_alerts:  d.approval_alerts  !== 'false',
          system_alerts:    d.system_alerts    === 'true',
        })
      }
    } catch {}
    setLoadingGeneral(false)
  }

  const loadShifts = async () => {
    setLoadingShifts(true)
    try {
      const res = await api.get('/admin/shifts')
      if (res.success) setShifts(res.data || [])
    } catch {}
    setLoadingShifts(false)
  }

  // ── Save General ──────────────────────────────────────────────────────────
  const saveGeneral = async () => {
    if (!general.company_name.trim()) { toast.error('Company name is required'); return }
    setSavingGeneral(true)
    try {
      const res = await api.put('/admin/settings', {
        company_name:  general.company_name,
        company_email: general.company_email,
      })
      if (res.success) toast.success('Company info saved! ✅')
      else toast.error(res.message || 'Failed to save')
    } catch { toast.error('Cannot connect to server') }
    setSavingGeneral(false)
  }

  // ── Save Screenshot Settings ──────────────────────────────────────────────
  const saveScreenshot = async () => {
    setSavingSS(true)
    try {
      const res = await api.put('/admin/settings', {
        screenshot_interval:          ssInterval.toString(),
        screenshot_interval_minutes:  ssInterval.toString(),
        screenshot_enabled:           ssEnabled.toString(),
      })
      if (res.success) {
        toast.success(`Screenshot interval set to ${ssInterval} min ✅`)
        // Update capture service if running
        if (ssEnabled) {
          if (window.__screenshotCapture) {
            clearInterval(window.__screenshotCapture)
          }
        }
      } else toast.error(res.message || 'Failed to save')
    } catch { toast.error('Cannot connect to server') }
    setSavingSS(false)
  }

  // ── Save / Edit Shift ─────────────────────────────────────────────────────
  const openShiftForm = (shift = null) => {
    setEditShift(shift)
    setShiftForm(shift
      ? { name: shift.name, start_time: shift.start_time||'09:00', end_time: shift.end_time||'18:00', days: shift.days||'Mon-Fri' }
      : { name:'', start_time:'09:00', end_time:'18:00', days:'Mon-Fri' }
    )
    setShowShiftForm(true)
  }

  const saveShift = async () => {
    if (!shiftForm.name.trim()) { toast.error('Shift name is required'); return }
    if (!shiftForm.start_time)  { toast.error('Start time is required'); return }
    if (!shiftForm.end_time)    { toast.error('End time is required'); return }
    setSavingShift(true)
    try {
      const res = editShift
        ? await api.put(`/admin/shifts/${editShift.id}`, shiftForm)
        : await api.post('/admin/shifts', shiftForm)
      if (res.success) {
        toast.success(editShift ? 'Shift updated! ✅' : 'Shift added! ✅')
        setShowShiftForm(false)
        setEditShift(null)
        loadShifts()
      } else toast.error(res.message || 'Failed')
    } catch { toast.error('Cannot connect to server') }
    setSavingShift(false)
  }

  const deleteShift = async (id) => {
    try {
      const res = await api.delete(`/admin/shifts/${id}`)
      if (res.success) { setShifts(prev => prev.filter(s => s.id !== id)); toast.success('Shift deleted') }
      else toast.error(res.message || 'Delete failed')
    } catch { toast.error('Cannot connect to server') }
  }

  // ── Save Notifications ────────────────────────────────────────────────────
  const saveNotifications = async () => {
    setSavingNotif(true)
    try {
      const res = await api.put('/admin/settings', {
        review_reminders: notif.review_reminders.toString(),
        task_deadlines:   notif.task_deadlines.toString(),
        approval_alerts:  notif.approval_alerts.toString(),
        system_alerts:    notif.system_alerts.toString(),
      })
      if (res.success) toast.success('Notification settings saved! ✅')
      else toast.error(res.message || 'Failed to save')
    } catch { toast.error('Cannot connect to server') }
    setSavingNotif(false)
  }

  return (
    <motion.div initial="hidden" animate="show" className="space-y-6 max-w-3xl">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Configure system-wide settings</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex gap-0 border-b border-gray-200 dark:border-dark-600 overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}>
            <tab.icon size={13} />{tab.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.2 }}>

          {/* ── GENERAL ── */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Company Information</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {loadingGeneral ? (
                  <div className="flex justify-center py-6">
                    <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                      className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full"/>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Name <span className="text-red-500">*</span></label>
                      <input value={general.company_name} onChange={e => setGeneral(g => ({...g, company_name: e.target.value}))}
                        placeholder="e.g. Sangria Edutainment Pvt Ltd" className={inputCls}/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Email</label>
                      <input type="email" value={general.company_email} onChange={e => setGeneral(g => ({...g, company_email: e.target.value}))}
                        placeholder="e.g. hr@sangria.com" className={inputCls}/>
                    </div>
                    <div className="flex justify-end pt-2">
                      <motion.button onClick={saveGeneral} disabled={savingGeneral}
                        whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors">
                        {savingGeneral
                          ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Saving…</>
                          : <><CheckCircle size={15}/> Save Changes</>
                        }
                      </motion.button>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {/* ── SCREENSHOT ── */}
          {activeTab === 'screenshot' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Camera size={15} className="text-primary-500"/>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Screenshot Capture Settings</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-5">

                {/* Interval slider */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Capture Interval</label>
                    <motion.span key={ssInterval} initial={{ scale:1.3 }} animate={{ scale:1 }}
                      className="text-lg font-bold text-primary-500">{ssInterval} min
                    </motion.span>
                  </div>
                  <input type="range" min={1} max={60} step={1}
                    value={ssInterval}
                    onChange={e => setSsInterval(Number(e.target.value))}
                    className="w-full accent-primary-500 cursor-pointer h-2 rounded-full"/>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>1 min</span>
                    <span className="text-primary-500 font-semibold">{ssInterval} min selected</span>
                    <span>60 min</span>
                  </div>
                  {/* Quick preset buttons */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[5, 10, 15, 20, 30].map(m => (
                      <button key={m} onClick={() => setSsInterval(m)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          ssInterval === m
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-primary-500/10 hover:text-primary-600'
                        }`}>
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enable toggle */}
                <Toggle
                  checked={ssEnabled}
                  onChange={setSsEnabled}
                  label="Enable screenshot capture"
                  hint="Auto-captures employee browser when logged in"
                />

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Camera size={14} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    The EPIP Desktop Agent reads this interval on each employee login. Changes apply within 30 seconds on active sessions.
                  </p>
                </div>

                <motion.button onClick={saveScreenshot} disabled={savingSSs}
                  whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors">
                  {savingSSs
                    ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Saving…</>
                    : <><CheckCircle size={15}/> Save Screenshot Settings</>
                  }
                </motion.button>
              </CardBody>
            </Card>
          )}

          {/* ── SHIFTS ── */}
          {activeTab === 'shifts' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Shift Timings</h3>
                  <button onClick={() => openShiftForm()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500 hover:text-white transition-colors">
                    <Plus size={13}/> Add Shift
                  </button>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {loadingShifts ? (
                  <div className="flex justify-center py-6">
                    <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                      className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full"/>
                  </div>
                ) : shifts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No shifts configured. Add your first shift.</p>
                ) : shifts.map((shift, i) => (
                  <motion.div key={shift.id}
                    initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: i*0.06 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock size={15} className="text-primary-500 flex-shrink-0"/>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{shift.name}</p>
                        <p className="text-xs text-gray-400">
                          {shift.start_time} – {shift.end_time} · {shift.days}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openShiftForm(shift)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-400 hover:text-primary-500 transition-colors">
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => deleteShift(shift.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Notification Settings</h3>
              </CardHeader>
              <CardBody>
                <Toggle checked={notif.review_reminders} onChange={v=>setNotif(n=>({...n,review_reminders:v}))} label="Performance review reminders" hint="Remind managers before review deadlines"/>
                <Toggle checked={notif.task_deadlines}   onChange={v=>setNotif(n=>({...n,task_deadlines:v}))}   label="Task deadline alerts"          hint="Alert employees for upcoming task deadlines"/>
                <Toggle checked={notif.approval_alerts}  onChange={v=>setNotif(n=>({...n,approval_alerts:v}))}  label="Approval notifications"        hint="Notify on leave/goal approvals"/>
                <Toggle checked={notif.system_alerts}    onChange={v=>setNotif(n=>({...n,system_alerts:v}))}    label="System health alerts"          hint="Critical system notifications"/>
                <div className="pt-4">
                  <motion.button onClick={saveNotifications} disabled={savingNotif}
                    whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors">
                    {savingNotif
                      ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Saving…</>
                      : <><CheckCircle size={15}/> Save Settings</>
                    }
                  </motion.button>
                </div>
              </CardBody>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Shift Form Modal ── */}
      <AnimatePresence>
        {showShiftForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShiftForm(false)}/>
            <motion.div initial={{ y:'100%', opacity:0 }} animate={{ y:0, opacity:1 }}
              exit={{ y:'100%', opacity:0 }} transition={{ type:'spring', stiffness:280, damping:28 }}
              className="relative bg-white dark:bg-dark-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6">
              <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mb-4 sm:hidden"/>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{editShift ? 'Edit Shift' : 'Add Shift'}</h3>
                <button onClick={() => setShowShiftForm(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400"><X size={16}/></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shift Name <span className="text-red-500">*</span></label>
                  <input value={shiftForm.name} onChange={e => setShiftForm(f => ({...f, name:e.target.value}))}
                    placeholder="e.g. Morning Shift" className={inputCls} autoFocus/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                    <input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({...f, start_time:e.target.value}))} className={inputCls}/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                    <input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({...f, end_time:e.target.value}))} className={inputCls}/>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Working Days</label>
                  <select value={shiftForm.days} onChange={e => setShiftForm(f => ({...f, days:e.target.value}))} className={inputCls}>
                    <option value="Mon-Fri">Monday – Friday</option>
                    <option value="Mon-Sat">Monday – Saturday</option>
                    <option value="Tue-Sat">Tuesday – Saturday</option>
                    <option value="Mon-Sun">All Days</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button onClick={() => setShowShiftForm(false)} className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">Cancel</button>
                <motion.button onClick={saveShift} disabled={savingShift}
                  whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60 transition-colors">
                  {savingShift
                    ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7, repeat:Infinity, ease:'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>Saving…</>
                    : <><CheckCircle size={15}/>{editShift ? 'Save' : 'Add Shift'}</>
                  }
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  )
}

export default AdminSettings
