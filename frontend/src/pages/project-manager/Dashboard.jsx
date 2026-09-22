import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, CheckSquare, TrendingUp, RefreshCw,
  AlertCircle, Activity, ArrowRight,
  Plus, X, BarChart3, Target, ChevronRight
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie, Legend, ResponsiveContainer
} from 'recharts'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import StatCard from '../../components/common/StatCard'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null
const fmtRel    = (d) => {
  const s = Math.floor((new Date() - new Date(d)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600)  return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

const PCT_COLOR = (p) =>
  p >= 100 ? '#22c55e' : p >= 60 ? '#6366f1' : p >= 30 ? '#f59e0b' : '#ef4444'

const PCT_TEXT = (p) =>
  p >= 100 ? 'text-green-500' : p >= 60 ? 'text-primary-500' : p >= 30 ? 'text-yellow-500' : 'text-red-400'

const STATUS_COLOR = {
  active: '#6366f1', in_progress: '#6366f1',
  completed: '#22c55e', on_hold: '#f59e0b',
  planning: '#94a3b8', cancelled: '#ef4444',
}
const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#94a3b8','#ef4444']

const CustomTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color || p.fill }}>{p.name}: {p.value}</p>)}
    </div>
  )
}

// ── Add Widget Panel ──────────────────────────────────────────────────────────
const AddWidgetPanel = ({ onSelect, activeWidgets, onClose }) => {
  const opts = [
    { id: 'chart', icon: BarChart3, title: 'Charts & Analytics',
      desc: 'Project completion chart, task breakdown pie, issues tracker, delayed employees',
      color: 'bg-blue-500/10 text-blue-500' },
    { id: 'kpi', icon: Target, title: 'KPI Dashboard',
      desc: 'All employees performance metrics, avg task completion % and rankings',
      color: 'bg-purple-500/10 text-purple-500' },
  ]
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y:'100%', opacity:0 }} animate={{ y:0, opacity:1 }}
        exit={{ y:'100%', opacity:0 }}
        transition={{ type:'spring', stiffness:280, damping:28 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-gray-300 dark:bg-dark-500 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Add Widget</h3>
            <p className="text-xs text-gray-400 mt-0.5">Add charts and KPIs to your dashboard</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {opts.map(opt => {
            const active = activeWidgets.includes(opt.id)
            return (
              <motion.button key={opt.id}
                onClick={() => { if (!active) { onSelect(opt.id); onClose() } }}
                whileHover={!active ? { scale:1.02, x:4 } : {}}
                whileTap={!active ? { scale:0.98 } : {}}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                  active
                    ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10 cursor-default'
                    : 'border-gray-100 dark:border-dark-600 hover:border-primary-400'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.color}`}>
                  <opt.icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{opt.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
                {active
                  ? <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex-shrink-0">Added ✓</span>
                  : <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                }
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Chart Widget ──────────────────────────────────────────────────────────────
const ChartWidget = ({ projects, tasks, teamUpdates, onRemove }) => {
  const projBarData = projects.map(p => ({
    name:  (p.name || p.title || '').substring(0, 10),
    pct:   p.completion_percent || 0,
    fill:  PCT_COLOR(p.completion_percent || 0),
  }))
  const taskPieData = [
    { name:'Done',        value: tasks.filter(t => t.status === 'done').length,        fill:'#22c55e' },
    { name:'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, fill:'#6366f1' },
    { name:'To Do',       value: tasks.filter(t => t.status === 'todo').length,        fill:'#94a3b8' },
    { name:'Overdue',     value: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length, fill:'#ef4444' },
  ].filter(d => d.value > 0)
  const issueData = projects.map(p => {
    const pt = tasks.filter(t => t.project_id === p.id || t.project_name === (p.name || p.title))
    const issues = pt.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
    return { name: (p.name || p.title || '').substring(0,12), issues }
  }).filter(d => d.issues > 0).sort((a,b) => b.issues - a.issues)
  const delayedEmps = (teamUpdates||[]).filter(e => e.overdue_tasks > 0).sort((a,b) => b.overdue_tasks - a.overdue_tasks)

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 size={14} className="text-blue-500" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Charts & Analytics</h3>
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 sm:p-5 space-y-6">
        {/* Project Completion Bar */}
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Project Completion %</p>
          {projects.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">No projects yet</p>
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projBarData} barSize={30} margin={{ left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize:10 }} interval={0} />
                  <YAxis tick={{ fontSize:10 }} domain={[0,100]} tickFormatter={v=>`${v}%`} />
                  <Tooltip formatter={v=>[`${v}%`,'Completion']} />
                  <Bar dataKey="pct" name="Completion" radius={[4,4,0,0]}>
                    {projBarData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
        {/* Breakdown + Issues */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Task Breakdown</p>
            {taskPieData.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">No tasks yet</p>
              : <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {taskPieData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v,n)=>[v,n]} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Issues (Overdue)</p>
            {issueData.length === 0
              ? <div className="flex flex-col items-center justify-center h-[150px] text-center">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                    <CheckSquare size={18} className="text-green-500" />
                  </div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">No issues! 🎉</p>
                  <p className="text-xs text-gray-400 mt-0.5">All tasks on track</p>
                </div>
              : <div className="space-y-2 mt-1">
                  {issueData.map((d,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{d.name}</span>
                      <div className="flex items-center gap-1">
                        <div className="h-2 rounded-full bg-red-100 dark:bg-red-900/20 overflow-hidden" style={{ width:`${Math.min(60, d.issues*12)}px` }}>
                          <div className="h-full bg-red-500 rounded-full w-full" />
                        </div>
                        <span className="text-xs font-bold text-red-500">{d.issues}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
        {/* Delayed Employees */}
        {delayedEmps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Delayed Employees</p>
            <div className="space-y-2">
              {delayedEmps.map(emp => (
                <div key={emp.employee_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20">
                  <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                    {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : emp.employee_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{emp.employee_name}</p>
                    <p className="text-[10px] text-gray-500">{emp.total_tasks} tasks · {emp.avg_completion}% avg</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-red-500 flex-shrink-0">
                    <AlertCircle size={12} />{emp.overdue_tasks} overdue
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── KPI Widget ────────────────────────────────────────────────────────────────
const KPIWidget = ({ teamUpdates, onRemove }) => {
  const PCT  = (p) => p>=100?'text-green-500':p>=60?'text-primary-500':p>=30?'text-yellow-500':'text-red-400'
  const BARR = (p) => p>=100?'bg-green-500':p>=60?'bg-primary-500':p>=30?'bg-yellow-500':'bg-red-400'
  const kpiData = (teamUpdates||[]).map(e => ({
    name: e.employee_name?.split(' ')[0] || 'Emp',
    kpi:  e.avg_completion,
    fill: PCT_COLOR(e.avg_completion),
  }))
  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Target size={14} className="text-purple-500" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">KPI Dashboard</h3>
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 sm:p-5 space-y-5">
        {!(teamUpdates||[]).length ? (
          <div className="text-center py-8">
            <Target size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Assign tasks to see KPI metrics</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Employee KPI (Avg Completion %)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={kpiData} barSize={28} margin={{ left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize:10 }} interval={0} />
                  <YAxis tick={{ fontSize:10 }} domain={[0,100]} tickFormatter={v=>`${v}%`} />
                  <Tooltip formatter={v=>[`${v}%`,'KPI Score']} />
                  <Bar dataKey="kpi" name="KPI Score" radius={[4,4,0,0]}>
                    {kpiData.map((e,i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">All Employees Performance</p>
              <div className="space-y-3">
                {(teamUpdates||[]).map((emp,i) => (
                  <motion.div key={emp.employee_id}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: i*0.04 }}
                    className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                      i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-gray-700':i===2?'bg-amber-600 text-white':'bg-gray-100 dark:bg-dark-600 text-gray-500'
                    }`}>{i+1}</span>
                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                      {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" /> : emp.employee_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{emp.employee_name}</p>
                        <span className={`text-xs font-bold flex-shrink-0 ml-2 ${PCT(emp.avg_completion)}`}>{emp.avg_completion}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                        <motion.div initial={{ width:0 }} animate={{ width:`${emp.avg_completion}%` }}
                          transition={{ duration:0.7, delay:i*0.05 }}
                          className={`h-full rounded-full ${BARR(emp.avg_completion)}`} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {emp.done_tasks}/{emp.total_tasks} done
                        {emp.overdue_tasks > 0 && <span className="text-red-400 ml-2">· {emp.overdue_tasks} overdue</span>}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PMDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [projects,    setProjects]    = useState([])
  const [tasks,       setTasks]       = useState([])
  const [teamUpdates, setTeamUpdates] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [showPanel,   setShowPanel]   = useState(false)
  const [widgets, setWidgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pm_widgets') || '[]') } catch { return [] }
  })

  const saveWidgets = (w) => { setWidgets(w); localStorage.setItem('pm_widgets', JSON.stringify(w)) }
  const addWidget    = (id) => { if (!widgets.includes(id)) saveWidgets([...widgets, id]) }
  const removeWidget = (id) => saveWidgets(widgets.filter(w => w !== id))

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const [pr, tr, ur] = await Promise.all([
        api.get('/projects?limit=200'),
        api.get('/tasks/team?limit=500'),
        api.get('/tasks/team-updates'),
      ])
      if (pr.success) setProjects(pr.data?.projects || pr.data || [])
      if (tr.success) setTasks(tr.data || [])
      if (ur.success) setTeamUpdates(ur.data || [])
    } catch {}
    setLoading(false); setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  // Stats
  const activeProj    = projects.filter(p => ['active','in_progress'].includes(p.status)).length
  const completedProj = projects.filter(p => p.status === 'completed').length
  const totalTasks    = tasks.length
  const doneTasks     = tasks.filter(t => t.status === 'done').length
  const completionRate = totalTasks ? Math.round((doneTasks/totalTasks)*100) : 0

  // All projects sorted
  const sortedProjects = [...projects].sort((a,b) => (b.completion_percent||0) - (a.completion_percent||0))

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-4 sm:space-y-5">

      {/* ── Header ── */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Project Management Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
            <motion.div animate={refreshing ? { rotate:360 } : {}} transition={{ duration:0.8, repeat:refreshing?Infinity:0, ease:'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
          <motion.button onClick={() => setShowPanel(true)}
            whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-purple-600 shadow-md shadow-primary-500/25">
            <Plus size={14} /> Add Widget
          </motion.button>
        </div>
      </motion.div>

      {/* ── 1. Stats Row ── */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Active Projects"  value={loading ? '—' : activeProj}            icon={FolderOpen}  color="primary" delay={0.1} />
        <StatCard title="Completed"        value={loading ? '—' : completedProj}         icon={TrendingUp}  color="green"   delay={0.2} />
        <StatCard title="Total Tasks"      value={loading ? '—' : totalTasks}            icon={CheckSquare} color="blue"    delay={0.3} />
        <StatCard title="Completion Rate"  value={loading ? '—' : `${completionRate}%`}  icon={Activity}    color="purple"  delay={0.4} />
      </motion.div>

      {/* ── 2. Project Progress — ALL projects ── */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp size={14} className="text-green-500" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Project Progress</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-dark-700 text-gray-500">
                  {projects.length}
                </span>
              </div>
              <button onClick={() => navigate('/pm/projects')}
                className="flex items-center gap-1 text-xs text-primary-500 hover:underline">
                View all <ArrowRight size={11} />
              </button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-6">
                <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                  className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full" />
              </div>
            ) : sortedProjects.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No projects yet</p>
              </div>
            ) : (
              sortedProjects.map((p, i) => {
                const pct = p.completion_percent || 0
                const col = PCT_COLOR(pct)
                return (
                  <motion.div key={p.id}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{p.name || p.title}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded capitalize flex-shrink-0"
                          style={{ background:`${STATUS_COLOR[p.status]||'#94a3b8'}20`, color:STATUS_COLOR[p.status]||'#94a3b8' }}>
                          {p.status?.replace('_',' ') || 'Planning'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {p.task_count > 0 && (
                          <span className="text-[10px] text-gray-400">{p.done_count||0}/{p.task_count} tasks</span>
                        )}
                        <span className="text-xs font-bold" style={{ color:col }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                      <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                        transition={{ duration:0.8, delay:i*0.06 }}
                        className="h-full rounded-full"
                        style={{ background:`linear-gradient(90deg,${col},${col}cc)` }} />
                    </div>
                  </motion.div>
                )
              })
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* ── 3. Project Completion Chart + Issues Breakdown ── */}
      <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <BarChart3 size={14} className="text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Completion Chart</h3>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex justify-center py-8">
                <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                  className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
              </div>
            ) : projects.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No projects yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[...projects].map(p => ({
                  name: (p.name||p.title||'').substring(0,10),
                  pct:  p.completion_percent || 0,
                  fill: PCT_COLOR(p.completion_percent||0),
                }))} barSize={28} margin={{ left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize:10 }} interval={0} />
                  <YAxis tick={{ fontSize:10 }} domain={[0,100]} tickFormatter={v=>`${v}%`} />
                  <Tooltip content={<CustomTip />} formatter={v=>[`${v}%`,'Completion']} />
                  <Bar dataKey="pct" name="Completion" radius={[4,4,0,0]}>
                    {projects.map((p,i) => <Cell key={i} fill={PCT_COLOR(p.completion_percent||0)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Issues Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle size={14} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Issues & Breakdown</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Task pie */}
            {loading ? (
              <div className="flex justify-center py-8">
                <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
                  className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full" />
              </div>
            ) : (
              <>
                {/* Mini task breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label:'Done',        val: tasks.filter(t => t.status === 'done').length,        color:'bg-green-500/10 text-green-600 dark:text-green-400' },
                    { label:'In Progress', val: tasks.filter(t => t.status === 'in_progress').length, color:'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                    { label:'To Do',       val: tasks.filter(t => t.status === 'todo').length,        color:'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
                    { label:'Overdue',     val: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length, color:'bg-red-500/10 text-red-500' },
                  ].map(s => (
                    <div key={s.label} className={`p-3 rounded-xl text-center ${s.color}`}>
                      <p className="text-xl font-bold">{s.val}</p>
                      <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Issues per project */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Issues per Project</p>
                  {tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length === 0 ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-500/5 border border-green-500/20">
                      <CheckSquare size={13} className="text-green-500" />
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">No issues — all tasks on track! 🎉</p>
                    </div>
                  ) : (
                    projects.map(p => {
                      const issues = tasks.filter(t =>
                        (t.project_id === p.id || t.project_name === (p.name||p.title)) &&
                        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done'
                      ).length
                      if (!issues) return null
                      return (
                        <div key={p.id} className="flex items-center gap-2 py-1.5">
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{p.name||p.title}</span>
                          <div className="flex items-center gap-1">
                            <div className="h-2 rounded-full bg-red-100 dark:bg-red-900/20 overflow-hidden" style={{ width:`${Math.min(60,issues*10)}px` }}>
                              <div className="h-full bg-red-500 rounded-full w-full" />
                            </div>
                            <span className="text-xs font-bold text-red-500">{issues}</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Widgets ── */}
      <AnimatePresence>
        {widgets.includes('chart') && (
          <ChartWidget key="chart" projects={projects} tasks={tasks} teamUpdates={teamUpdates}
            onRemove={() => removeWidget('chart')} />
        )}
        {widgets.includes('kpi') && (
          <KPIWidget key="kpi" teamUpdates={teamUpdates} onRemove={() => removeWidget('kpi')} />
        )}
      </AnimatePresence>

      {/* ── Add Widget Panel ── */}
      <AnimatePresence>
        {showPanel && (
          <AddWidgetPanel onSelect={addWidget} activeWidgets={widgets} onClose={() => setShowPanel(false)} />
        )}
      </AnimatePresence>

    </div>
  )
}

export default PMDashboard
