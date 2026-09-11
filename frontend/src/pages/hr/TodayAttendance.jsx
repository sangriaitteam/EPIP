import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, LogIn, LogOut, Users, CheckCircle, XCircle, AlertCircle, Search, RefreshCw } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Card, { CardBody } from '../../components/common/Card'
import { api } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

const fadeUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } } }

const fmtTime = (ts) => ts
  ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const statusBadge = (row) => {
  if (!row.check_in)  return { label: 'Absent',       color: 'bg-red-500/10 text-red-500' }
  if (!row.check_out) return { label: 'In Office',    color: 'bg-green-500/10 text-green-600 dark:text-green-400' }
  return               { label: 'Completed',          color: 'bg-blue-500/10 text-blue-500' }
}

const HRTodayAttendance = () => {
  const [records,    setRecords]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('all')  // all | present | absent
  const [lastUpdated,setLastUpdated]= useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get('/attendance/today-all')
      if (res.success) {
        setRecords(res.data)
        setLastUpdated(new Date())
      }
    } catch { if (!silent) toast.error('Failed to load attendance') }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => load(true), 60000)
    return () => clearInterval(interval)
  }, [load])

  // Stats
  const total    = records.length
  const present  = records.filter(r => r.check_in).length
  const absent   = records.filter(r => !r.check_in).length
  const inOffice = records.filter(r => r.check_in && !r.check_out).length
  const done     = records.filter(r => r.check_out).length

  // Filter + Search
  const filtered = records.filter(r => {
    const name = `${r.first_name} ${r.last_name}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase()) ||
      (r.department || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.emp_code || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'present' ? !!r.check_in :
      filter === 'absent'  ? !r.check_in : true
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Today's Attendance</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <p className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
          >
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Total Employees" value={total}    subtitle="Active"      icon={Users}        color="primary" delay={0.1} />
        <StatCard title="Present"         value={present}  subtitle="Checked in"  icon={CheckCircle}  color="green"   delay={0.2} />
        <StatCard title="In Office"       value={inOffice} subtitle="Working now" icon={Clock}        color="blue"    delay={0.3} />
        <StatCard title="Absent"          value={absent}   subtitle="Not checked" icon={XCircle}      color="red"     delay={0.4} />
      </motion.div>

      {/* Search + Filter */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, department, ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { key: 'all',     label: `All (${total})` },
            { key: 'present', label: `Present (${present})` },
            { key: 'absent',  label: `Absent (${absent})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </motion.div>

      {/* Attendance list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <Users size={36} className="mx-auto text-gray-300 dark:text-dark-500 mb-3" />
            <p className="font-medium text-gray-500 dark:text-gray-400">
              {search ? 'No results found' : 'No attendance records yet'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-700">
                  {['Employee', 'Dept', 'Check In', 'Check Out', 'Hours', 'Status', 'Late'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                <AnimatePresence>
                  {filtered.map((row, i) => {
                    const name   = `${row.first_name} ${row.last_name}`
                    const badge  = statusBadge(row)
                    return (
                      <motion.tr
                        key={row.employee_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} size="sm" online={!!(row.check_in && !row.check_out)} />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{name}</p>
                              <p className="text-xs text-gray-400">{row.emp_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{row.department || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold text-sm ${row.check_in ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                            {fmtTime(row.check_in)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold text-sm ${row.check_out ? 'text-red-500' : 'text-gray-400'}`}>
                            {row.check_out ? fmtTime(row.check_out) : row.check_in ? <span className="text-xs text-green-500 animate-pulse">In office</span> : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-gray-300">
                          {row.hours_worked ? `${row.hours_worked}h` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.is_late
                            ? <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold"><AlertCircle size={11} /> Late</span>
                            : row.check_in
                            ? <span className="text-xs text-green-500">On time</span>
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((row, i) => {
              const name  = `${row.first_name} ${row.last_name}`
              const badge = statusBadge(row)
              return (
                <motion.div
                  key={row.employee_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={name} size="md" online={!!(row.check_in && !row.check_out)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{name}</p>
                      <p className="text-xs text-gray-400">{row.emp_code} · {row.department || '—'}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-green-500/10">
                      <p className="text-xs font-bold text-green-600 dark:text-green-400">{fmtTime(row.check_in)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Check In</p>
                    </div>
                    <div className="p-2 rounded-xl bg-red-500/10">
                      <p className="text-xs font-bold text-red-500">{row.check_out ? fmtTime(row.check_out) : '—'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Check Out</p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-500/10">
                      <p className="text-xs font-bold text-blue-500">{row.hours_worked ? `${row.hours_worked}h` : '—'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Hours</p>
                    </div>
                  </div>
                  {row.is_late && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-orange-500">
                      <AlertCircle size={11} /> Late arrival
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Footer count */}
          <p className="text-xs text-gray-400 text-center">
            Showing {filtered.length} of {total} employees · Auto-refreshes every 60 seconds
          </p>
        </>
      )}
    </div>
  )
}

export default HRTodayAttendance
