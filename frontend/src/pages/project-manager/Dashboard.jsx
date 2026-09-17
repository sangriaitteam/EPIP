import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FolderOpen, Users, CheckSquare, TrendingUp,
  Clock, Target, BarChart3, RefreshCw
} from 'lucide-react'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import StatCard from '../../components/common/StatCard'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const fadeUp    = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const PMDashboard = () => {
  const { user } = useAuth()
  const [projects,    setProjects]    = useState([])
  const [tasks,       setTasks]       = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [projRes, taskRes, empRes] = await Promise.all([
        api.get('/projects?limit=50'),
        api.get('/tasks/team?limit=100'),
        api.get('/employees?limit=200'),
      ])
      if (projRes.success) setProjects(projRes.data?.projects || projRes.data || [])
      if (taskRes.success) setTasks(taskRes.data || [])
      if (empRes.success)  setEmployees(empRes.data || [])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  // Stats
  const activeProjects  = projects.filter(p => p.status === 'active' || p.status === 'in_progress').length
  const totalTasks      = tasks.length
  const doneTasks       = tasks.filter(t => t.status === 'done').length
  const completionRate  = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Project Management Dashboard
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : {}}
            transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}
          >
            <RefreshCw size={13} />
          </motion.div>
          Refresh
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Active Projects"  value={loading ? '—' : activeProjects}      icon={FolderOpen}   color="primary" delay={0.1} />
        <StatCard title="Total Tasks"      value={loading ? '—' : totalTasks}           icon={CheckSquare}  color="blue"    delay={0.2} />
        <StatCard title="Completion Rate"  value={loading ? '—' : `${completionRate}%`} icon={TrendingUp}   color="green"   delay={0.3} />
        <StatCard title="Team Members"     value={loading ? '—' : employees.length}     icon={Users}        color="purple"  delay={0.4} />
      </motion.div>

      {/* Projects + Tasks grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Recent Projects */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <FolderOpen size={14} className="text-primary-500" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Recent Projects</h3>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              ) : projects.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No projects yet</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-dark-600">
                  {projects.slice(0, 6).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name || p.title}</p>
                        <p className="text-xs text-gray-400 truncate">{p.department_name || p.description || '—'}</p>
                      </div>
                      <span className={`ml-3 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 capitalize ${
                        p.status === 'active' || p.status === 'in_progress'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : p.status === 'completed'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-yellow-500/10 text-yellow-600'
                      }`}>
                        {p.status?.replace('_', ' ') || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* Task Summary */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckSquare size={14} className="text-blue-500" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Task Overview</h3>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="flex justify-center py-10">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-7 h-7 border-2 border-blue-500/30 border-t-blue-500 rounded-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: 'Done',        count: tasks.filter(t => t.status === 'done').length,        color: 'bg-green-500' },
                    { label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length, color: 'bg-blue-500' },
                    { label: 'To Do',       count: tasks.filter(t => t.status === 'todo').length,        color: 'bg-gray-400' },
                    { label: 'Overdue',     count: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length, color: 'bg-red-500' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">{item.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: totalTasks ? `${(item.count / totalTasks) * 100}%` : '0%' }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-6 text-right flex-shrink-0">
                        {item.count}
                      </span>
                    </div>
                  ))}

                  {/* Overall completion */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-600">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Overall Completion</span>
                      <span className="text-sm font-bold text-primary-500">{completionRate}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completionRate}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </motion.div>
      </div>

    </motion.div>
  )
}

export default PMDashboard
