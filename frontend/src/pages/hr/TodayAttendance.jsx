import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, LogIn, LogOut, Users, CheckCircle, XCircle,
  AlertCircle, Search, RefreshCw, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import Card, { CardBody } from '../../components/common/Card'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } },
}

const fmtTime = (ts) => ts
  ? new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  : '—'

const toISO = (d) => d.toISOString().split('T')[0]  // YYYY-MM-DD

const statusBadge = (row) => {
  if (!row.check_in)  return { label: 'Absent',    color: 'bg-red-500/10 text-red-500' }
  if (!row.check_out) return { label: 'In Office',  color: 'bg-green-500/10 text-green-600 dark:text-green-400' }
  return               { label: 'Completed',        color: 'bg-blue-500/10 text-blue-500' }
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const MiniCalendar = ({ selectedDate, onSelect, attendanceDates }) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate))

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December']
  const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today       = toISO(new Date())

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => {
    const next = new Date(year, month + 1, 1)
    if (next <= new Date()) setViewDate(next)
  }

  const isSelected = (d) => {
    if (!d) return false
    const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return dt === selectedDate
  }

  const isToday = (d) => {
    if (!d) return false
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}` === today
  }

  const isFuture = (d) => {
    if (!d) return false
    const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return dt > today
  }

  const hasData = (d) => {
    if (!d) return false
    const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return attendanceDates?.includes(dt)
  }

  const handleClick = (d) => {
    if (!d || isFuture(d)) return
    const dt = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    onSelect(dt)
  }

  const isNextDisabled = new Date(year, month + 1, 1) > new Date()

  return (
    <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm p-4 w-full">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTHS[month]} {year}
        </p>
        <button onClick={nextMonth} disabled={isNextDisabled}
          className={`p-1.5 rounded-lg transition-colors ${
            isNextDisabled
              ? 'text-gray-300 dark:text-dark-500 cursor-default'
              : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500'
          }`}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => (
          <button key={i} onClick={() => handleClick(d)}
            disabled={!d || isFuture(d)}
            className={`relative w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
              !d
                ? 'invisible'
                : isFuture(d)
                ? 'text-gray-300 dark:text-dark-600 cursor-default'
                : isSelected(d)
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                : isToday(d)
                ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400 font-bold ring-1 ring-primary-500/40'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}>
            {d}
            {/* Dot indicator — has attendance data */}
            {d && !isFuture(d) && hasData(d) && !isSelected(d) && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-dark-600">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-[10px] text-gray-400">Has data</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-md bg-primary-500 inline-block" />
          <span className="text-[10px] text-gray-400">Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-4 rounded-md bg-primary-500/15 ring-1 ring-primary-500/40 inline-block" />
          <span className="text-[10px] text-gray-400">Today</span>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const HRTodayAttendance = () => {
  const todayStr = toISO(new Date())

  const [records,       setRecords]       = useState([])
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState('all')
  const [selectedDate,  setSelectedDate]  = useState(todayStr)
  const [lastUpdated,   setLastUpdated]   = useState(null)
  const [refreshing,    setRefreshing]    = useState(false)
  const [attendanceDates, setAttendanceDates] = useState([]) // dates that have data
  const [showCalendar,  setShowCalendar]  = useState(true)

  const load = useCallback(async (date, silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await api.get(`/attendance/today-all?date=${date}`)
      if (res.success) {
        setRecords(res.data)
        setLastUpdated(new Date())
        // Track dates that have at least one check-in
        if (res.data.some(r => r.check_in)) {
          setAttendanceDates(prev => prev.includes(date) ? prev : [...prev, date])
        }
      }
    } catch { if (!silent) toast.error('Failed to load attendance') }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    load(selectedDate)
    // Auto-refresh only for today
    if (selectedDate === todayStr) {
      const interval = setInterval(() => load(selectedDate, true), 60000)
      return () => clearInterval(interval)
    }
  }, [selectedDate, load, todayStr])

  // Stats
  const total    = records.length
  const present  = records.filter(r => r.check_in).length
  const absent   = records.filter(r => !r.check_in).length
  const inOffice = records.filter(r => r.check_in && !r.check_out).length

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

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const isToday = selectedDate === todayStr

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {isToday ? "Today's Attendance" : 'Attendance'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{displayDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button onClick={() => setSelectedDate(todayStr)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white transition-colors">
              Back to Today
            </button>
          )}
          {lastUpdated && (
            <p className="text-xs text-gray-400">
              {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button onClick={() => load(selectedDate, true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
            <motion.div animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 0.8, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={13} />
            </motion.div>
            Refresh
          </button>
          <button onClick={() => setShowCalendar(s => !s)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              showCalendar
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
            }`}>
            <Calendar size={13} />
            {showCalendar ? 'Hide Calendar' : 'Calendar'}
          </button>
        </div>
      </motion.div>

      {/* Main layout — Calendar + Table */}
      <div className={`flex gap-5 items-start ${showCalendar ? 'flex-col lg:flex-row' : ''}`}>

        {/* Calendar */}
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="lg:w-64 w-full flex-shrink-0"
            >
              <MiniCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                attendanceDates={attendanceDates}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right side — Stats + Table */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Total"    value={total}    subtitle="Employees"   icon={Users}        color="primary" delay={0.1} />
            <StatCard title="Present"  value={present}  subtitle="Checked in"  icon={CheckCircle}  color="green"   delay={0.2} />
            <StatCard title="In Office"value={inOffice} subtitle="Working now" icon={Clock}        color="blue"    delay={0.3} />
            <StatCard title="Absent"   value={absent}   subtitle="Not checked" icon={XCircle}      color="red"     delay={0.4} />
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, department, ID..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex gap-2">
              {[
                { key: 'all',     label: `All (${total})` },
                { key: 'present', label: `Present (${present})` },
                { key: 'absent',  label: `Absent (${absent})` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    filter === f.key
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attendance list */}
          {loading ? (
            <div className="flex justify-center py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardBody className="py-12 text-center">
                <Users size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="font-medium text-gray-500 dark:text-gray-400">
                  {search ? 'No results found' : `No attendance records for ${displayDate}`}
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
                      {['Employee','Dept','Check In','Check Out','Hours','Status','Late'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                    <AnimatePresence>
                      {filtered.map((row, i) => {
                        const name  = `${row.first_name} ${row.last_name}`
                        const badge = statusBadge(row)
                        return (
                          <motion.tr key={row.employee_id}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={name} src={row.avatar_url} size="sm" online={!!(row.check_in && !row.check_out)} animate={false} />
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
                                {row.check_out
                                  ? fmtTime(row.check_out)
                                  : row.check_in
                                  ? <span className="text-xs text-green-500 animate-pulse">In office</span>
                                  : '—'}
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
                    <motion.div key={row.employee_id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={name} src={row.avatar_url} size="md" online={!!(row.check_in && !row.check_out)} animate={false} />
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
                    </motion.div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-400 text-center">
                Showing {filtered.length} of {total} employees
                {isToday && ' · Auto-refreshes every 60 seconds'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default HRTodayAttendance
