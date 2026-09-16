import React from 'react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Building2, Shield, Settings, Clock, LogIn, LogOut, RefreshCw
} from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import Card, { CardHeader, CardBody } from '../../components/common/Card'
import Avatar from '../../components/common/Avatar'
import { adminService } from '../../services/adminService'
import { dashboardService } from '../../services/dashboardService'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const item = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { type: 'spring', stiffness: 110, damping: 14 } }
}

const AdminDashboard = () => {
  const [stats,        setStats]        = useState(null)
  const [depts,        setDepts]         = useState([])
  const [attendance,   setAttendance]    = useState([])
  const [attLoading,   setAttLoading]    = useState(true)
  const [attRefreshing,setAttRefreshing] = useState(false)
  const [lastUpdated,  setLastUpdated]   = useState(null)

  useEffect(() => {
    dashboardService.getHR().then(d => { if (d) setStats(d) }).catch(() => {})
    adminService.getDepartments().then(d => { if (d?.length) setDepts(d) }).catch(() => {})
    loadAttendance()
    const interval = setInterval(() => loadAttendance(true), 60000)
    return () => clearInterval(interval)
  }, [])

  const loadAttendance = async (silent = false) => {
    if (!silent) setAttLoading(true)
    else setAttRefreshing(true)
    try {
      const res = await api.get('/attendance/today-all')
      if (res.success) { setAttendance(res.data); setLastUpdated(new Date()) }
    } catch {}
    setAttLoading(false)
    setAttRefreshing(false)
  }

  const fmtTime = (ts) => ts
    ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const present  = attendance.filter(r => r.check_in).length
  const inOffice = attendance.filter(r => r.check_in && !r.check_out).length
  const absent   = attendance.filter(r => !r.check_in).length

  return (
  <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
    <motion.div variants={item}>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Full system control · EPIP Platform</p>
    </motion.div>

    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Employees" value={stats?.total_employees ?? stats?.totalEmployees ?? '—'} icon={Users}     color="primary" delay={0.1} subtitle={`${stats?.active_employees ?? stats?.activeEmployees ?? 0} active`} />
      <StatCard title="Departments"     value={depts.length || '—'}                                   icon={Building2} color="blue"    delay={0.2} />
      <StatCard title="Active Roles"    value={4}                                                      icon={Shield}    color="purple"  delay={0.3} subtitle="employee, hr, admin, superadmin" />
      <StatCard title="System Health"   value={stats ? '100%' : '—'}                                  icon={Settings}  color="green"   delay={0.4} />
    </div>

    {/* ── Today's Attendance ── */}
    <motion.div variants={item}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock size={16} className="text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Today's Attendance</h3>
                <p className="text-xs text-gray-400">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
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
                <motion.div animate={attRefreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: attRefreshing ? Infinity : 0, ease: 'linear' }}>
                  <RefreshCw size={13} />
                </motion.div>
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
            <div className="py-10 text-center text-gray-400 text-sm">No employees found</div>
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
                      const name = `${row.first_name} ${row.last_name}`
                      const isIn = !!(row.check_in && !row.check_out)
                      return (
                        <motion.tr key={row.employee_id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
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
                {attendance.map((row, i) => {
                  const name = `${row.first_name} ${row.last_name}`
                  const isIn = !!(row.check_in && !row.check_out)
                  return (
                    <div key={row.employee_id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={name} size="sm" online={isIn} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{name}</p>
                        <p className="text-xs text-gray-400">{row.emp_code}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400">{fmtTime(row.check_in)}</p>
                        <p className="text-xs text-red-500">{row.check_out ? fmtTime(row.check_out) : isIn ? '—' : 'Absent'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {lastUpdated && (
                <p className="text-xs text-gray-400 text-center py-2.5 border-t border-gray-100 dark:border-dark-600">
                  Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 60s
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </motion.div>

    {/* Charts + Departments */}    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Real Stats Summary */}
      <Card delay={0.3}>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Company Overview</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          {[
            { label: 'Total Employees',    value: stats?.total_employees ?? stats?.totalEmployees ?? '—', color: 'text-primary-500' },
            { label: 'Active Employees',   value: stats?.active_employees ?? stats?.activeEmployees ?? '—', color: 'text-green-500' },
            { label: 'Attendance Rate',    value: stats?.attendance_rate ? `${stats.attendance_rate}%` : '—', color: 'text-blue-500' },
            { label: 'Avg Performance',    value: stats?.avg_performance || stats?.avg_performance_score || '—', color: 'text-purple-500' },
            { label: 'Pending Reviews',    value: stats?.pending_reviews ?? '—', color: 'text-yellow-500' },
            { label: 'Total Departments',  value: depts.length || '—', color: 'text-teal-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-700">
              <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
              <span className={`text-lg font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Department Summary — real data */}
      <Card delay={0.4}>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Department Summary</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          {depts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No departments configured</p>
          ) : depts.map((dept, i) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 150 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-700"
            >
              <div className="w-3 h-8 rounded-full flex-shrink-0"
                style={{ backgroundColor: dept.color || '#6366f1' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{dept.name}</p>
                {dept.head && <p className="text-xs text-gray-400 truncate">{dept.head}</p>}
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                {dept.employees || dept.employee_count || 0}
              </span>
              <span className="text-xs text-gray-400">emp</span>
            </motion.div>
          ))}
        </CardBody>
      </Card>
    </div>

  </motion.div>
  )
}

export default AdminDashboard
