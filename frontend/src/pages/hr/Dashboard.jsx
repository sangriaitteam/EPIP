import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Clock, BarChart3, Trophy, Calendar } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import { PerformanceLineChart, AttendanceBarChart, DepartmentBarChart } from '../../components/charts/PerformanceChart'
import { dashboardService } from '../../services/dashboardService'
import { adminService } from '../../services/adminService'
import { api } from '../../services/api'
import { employeeService } from '../../services/employeeService'
import { attendanceService } from '../../services/attendanceService'
import { getScoreColor, formatDate } from '../../utils/helpers'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const HRDashboard = () => {
  const [stats,         setStats]         = useState(null)
  const [departments,   setDepartments]   = useState([])
  const [employees,     setEmployees]     = useState([])
  const [weeklyData,    setWeeklyData]    = useState([])
  const [holidays,      setHolidays]      = useState([])
  const [loading,       setLoading]       = useState(true)

  const now = new Date()

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([
        // HR stats — real
        dashboardService.getHR().then(d => { if (d) setStats(d) }),
        // Departments — real
        adminService.getDepartments().then(d => { if (d?.length) setDepartments(d) }),
        // All employees for top performers
        employeeService.getAll().then(d => { if (d?.length) setEmployees(d) }),
        // Attendance weekly for current month
        api.get(`/attendance/today-all`).then(res => {
          // Use today-all to compute weekly-like stats
        }),
        // Holidays
        api.get('/attendance/holidays').then(res => {
          if (res.success && res.data?.length) setHolidays(res.data)
        }),
      ])
      setLoading(false)
    }
    init()
  }, [])

  // Upcoming holidays — next 5 from today
  const today = new Date()
  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5)

  // Top performers — employees sorted by profile_completion as proxy
  const topPerformers = [...employees]
    .filter(e => e.name || (e.first_name && e.last_name))
    .sort((a, b) => (b.profile_completion || b.profileCompletion || 0) - (a.profile_completion || a.profileCompletion || 0))
    .slice(0, 3)

  // Dept scores — use departments with employee count
  const deptScoreData = departments.slice(0, 6).map(d => ({
    name:  d.name,
    score: d.employees || d.employee_count || 0,
  }))

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">HR Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Company-wide overview · {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
      </motion.div>

      {/* Stats — all real */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={stats?.total_employees ?? '—'}
          subtitle={`${stats?.active_employees ?? 0} active`}
          icon={Users} color="primary" delay={0.1}
        />
        <StatCard
          title="Attendance Rate"
          value={stats?.attendance_rate ? `${stats.attendance_rate}%` : '—'}
          subtitle="This month"
          icon={Clock} color="green" delay={0.2}
        />
        <StatCard
          title="Avg Performance"
          value={stats?.avg_performance || '—'}
          subtitle="All employees"
          icon={TrendingUp} color="blue" delay={0.3}
        />
        <StatCard
          title="Pending Reviews"
          value={stats?.pending_reviews ?? '—'}
          subtitle="Needs action"
          icon={BarChart3} color="yellow" delay={0.4}
        />
      </motion.div>

      {/* No real chart data note */}
      {employees.length === 0 && departments.length === 0 && (
        <motion.div variants={item}
          className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <TrendingUp size={16} className="text-blue-500" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Charts will populate as employees are added and check-in data accumulates.
          </p>
        </motion.div>
      )}

      {/* Departments + Top Performers + Holidays */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Department Overview */}
        <Card delay={0.4}>
          <CardHeader>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Department Overview</h3>
          </CardHeader>
          <CardBody className="space-y-2">
            {departments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No departments configured</p>
            ) : departments.map((dept, i) => (
              <motion.div key={dept.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.06 }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (dept.color || '#6366f1') + '20' }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{dept.name}</p>
                    <span className="text-xs text-gray-400">{dept.employees || dept.employee_count || 0} emp</span>
                  </div>
                  {dept.head && <p className="text-xs text-gray-400 truncate">Head: {dept.head}</p>}
                </div>
              </motion.div>
            ))}
          </CardBody>
        </Card>

        {/* Top Performers */}
        <Card delay={0.5}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Employees</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {employees.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No employees added yet</p>
            ) : employees.slice(0, 4).map((emp, i) => {
              const name = emp.name || `${emp.first_name||''} ${emp.last_name||''}`.trim()
              return (
                <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-dark-700">
                  <div className="relative flex-shrink-0">
                    <Avatar name={name} size="sm" online={emp.status === 'active'} />
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold text-white ${
                      i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-primary-500'
                    }`}>{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{emp.designation || '—'}</p>
                  </div>
                  <Badge
                    label={emp.status || 'active'}
                    color={emp.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}
                    dot
                  />
                </div>
              )
            })}
            {employees.length > 4 && (
              <p className="text-xs text-gray-400 text-center">+{employees.length - 4} more employees</p>
            )}
          </CardBody>
        </Card>

        {/* Upcoming Holidays */}
        <Card delay={0.55}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-primary-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Upcoming Holidays</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {upcomingHolidays.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No upcoming holidays</p>
            ) : upcomingHolidays.map((h, i) => (
              <motion.div key={h.id}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.06 }}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-dark-700"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  h.type === 'national' ? 'bg-green-500/10' : 'bg-blue-500/10'
                }`}>
                  <Calendar size={14} className={h.type === 'national' ? 'text-green-500' : 'text-blue-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{h.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(h.date)}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  h.type === 'national' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-500'
                }`}>{h.type === 'national' ? 'Govt' : 'Co.'}</span>
              </motion.div>
            ))}
          </CardBody>
        </Card>

      </div>



    </motion.div>
  )
}

export default HRDashboard
