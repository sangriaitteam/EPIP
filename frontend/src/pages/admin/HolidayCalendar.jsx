import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Plus, Trash2, X, AlertCircle,
  ChevronLeft, ChevronRight, Check
} from 'lucide-react'
import { api } from '../../services/api'
import toast from 'react-hot-toast'

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']

const HOLIDAY_TYPES = [
  { value: 'national', label: '🏛️ Government / National', color: 'green' },
  { value: 'company',  label: '🏢 Company / Private',     color: 'blue'  },
  { value: 'optional', label: '⭐ Optional',               color: 'yellow'},
]

const typeStyle = {
  national: 'bg-green-500  text-white',
  company:  'bg-blue-500   text-white',
  optional: 'bg-yellow-500 text-white',
}
const typeBadge = {
  national: 'bg-green-500/10  text-green-600  dark:text-green-400  border-green-500/20',
  company:  'bg-blue-500/10   text-blue-600   dark:text-blue-400   border-blue-500/20',
  optional: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
}
const typeLabel = { national: 'National', company: 'Company', optional: 'Optional' }

// ── Helpers ────────────────────────────────────────────────────────────────────
const isoDate = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const formatFull = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  })

// ── Add Holiday Modal ─────────────────────────────────────────────────────────
const AddModal = ({ date, onClose, onAdded }) => {
  const [form,   setForm]   = useState({ name: '', type: 'national' })
  const [saving, setSaving] = useState(false)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Holiday name is required'); return }
    setSaving(true)
    try {
      const res = await api.post('/admin/holidays', { ...form, date })
      if (res.success) {
        toast.success(`✅ "${form.name}" added! Employees notified.`)
        onAdded(res.data)
        onClose()
      } else { toast.error(res.message || 'Failed to add holiday') }
    } catch { toast.error('Cannot connect to server') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-dark-800 w-full sm:max-w-md
          rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 p-6 z-10"
      >
        <div className="w-10 h-1 bg-gray-300 dark:bg-dark-500 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Add Holiday</h3>
            <p className="text-sm text-primary-500 font-medium mt-0.5">{formatFull(date)}</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Holiday Name <span className="text-red-500">*</span>
            </label>
            <input value={form.name} onChange={e => setF('name', e.target.value)}
              placeholder="e.g. Republic Day, Diwali, Company Foundation Day"
              autoFocus
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-600
                bg-white dark:bg-dark-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Holiday Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {HOLIDAY_TYPES.map(t => (
                <button key={t.value} onClick={() => setF('type', t.value)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                    form.type === t.value
                      ? typeBadge[t.value] + ' border-current'
                      : 'border-gray-200 dark:border-dark-600 text-gray-500 dark:text-gray-400'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              All active employees will receive a notification about this holiday.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button onClick={onClose}
            className="py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-dark-600
              text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
            Cancel
          </button>
          <motion.button onClick={handleAdd} disabled={saving}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500
              hover:bg-primary-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
            {saving
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              : <><Plus size={15} /> Add Holiday</>
            }
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Single Month Grid ─────────────────────────────────────────────────────────
const MonthGrid = ({ year, monthIdx, holidayMap, onDayClick }) => {
  const firstDay    = new Date(year, monthIdx, 1).getDay()
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const today       = new Date()
  const todayStr    = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600
        shadow-sm hover:shadow-md transition-shadow p-4"
    >
      {/* Month name */}
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 text-center">
        {MONTHS[monthIdx]}
      </p>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1.5">
        {DAYS.map(d => (
          <p key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</p>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />

          const dateStr  = isoDate(year, monthIdx, day)
          const holiday  = holidayMap[dateStr]
          const isToday  = dateStr === todayStr
          const isSunday = new Date(year, monthIdx, day).getDay() === 0
          const isSat    = new Date(year, monthIdx, day).getDay() === 6
          const isPast   = dateStr < todayStr

          return (
            <motion.button
              key={day}
              onClick={() => onDayClick(dateStr, holiday)}
              whileHover={{ scale: holiday ? 1.15 : 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={holiday ? `${holiday.name} (${typeLabel[holiday.type]})` : `Add holiday — ${formatFull(dateStr)}`}
              className={`
                aspect-square flex items-center justify-center text-[11px] font-medium
                rounded-lg transition-all relative cursor-pointer
                ${holiday
                  ? `${typeStyle[holiday.type]} shadow-sm font-bold`
                  : isToday
                  ? 'ring-2 ring-primary-500 text-primary-600 dark:text-primary-400 font-bold bg-primary-500/10'
                  : isSunday || isSat
                  ? 'text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                  : isPast
                  ? 'text-gray-300 dark:text-gray-600 hover:bg-gray-50 dark:hover:bg-dark-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-primary-500/10 hover:text-primary-600 dark:hover:text-primary-400'
                }
              `}
            >
              {day}
              {/* Small dot for holiday type indicator */}
              {holiday && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full
                  bg-white/80 border border-white/50" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Month holiday count */}
      {Object.keys(holidayMap).filter(d => {
        const [y, m] = d.split('-').map(Number)
        return y === year && m === monthIdx + 1
      }).length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-dark-600 flex justify-center">
          <span className="text-[10px] font-semibold text-primary-500">
            {Object.keys(holidayMap).filter(d => {
              const [y, m] = d.split('-').map(Number)
              return y === year && m === monthIdx + 1
            }).length} holiday{Object.keys(holidayMap).filter(d => {
              const [y, m] = d.split('-').map(Number)
              return y === year && m === monthIdx + 1
            }).length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </motion.div>
  )
}

// ── Holiday List Item ─────────────────────────────────────────────────────────
const HolidayListItem = ({ h, onRemove, removing }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 12, height: 0 }} layout
    className="flex items-center justify-between p-3 rounded-xl
      bg-gray-50 dark:bg-dark-700 border border-gray-100 dark:border-dark-600"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        h.type === 'national' ? 'bg-green-500' :
        h.type === 'company'  ? 'bg-blue-500'  : 'bg-yellow-500'
      }`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{h.name}</p>
        <p className="text-xs text-gray-400">
          {formatFull(h.date?.split('T')[0] || h.date)}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge[h.type] || typeBadge.national}`}>
        {typeLabel[h.type] || h.type}
      </span>
      <button onClick={() => onRemove(h.id)} disabled={removing === h.id}
        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10
          text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">
        {removing === h.id
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full" />
          : <Trash2 size={13} />
        }
      </button>
    </div>
  </motion.div>
)

// ── Main Page ─────────────────────────────────────────────────────────────────
const AdminHolidayCalendar = () => {
  const [year,     setYear]     = useState(new Date().getFullYear())
  const [holidays, setHolidays] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [removing, setRemoving] = useState(null)
  const [modal,    setModal]    = useState(null)   // { date, existing }
  // Active filter tab on holiday list
  const [filter,   setFilter]   = useState('all')

  // ── Load holidays for selected year ────────────────────────────────────────
  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/holidays')
      if (res.success) setHolidays(res.data || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Build a map: "YYYY-MM-DD" → holiday object (for O(1) lookup per cell)
  const yearHolidays = holidays.filter(h => {
    const d = h.date?.split('T')[0] || h.date || ''
    return d.startsWith(String(year))
  })

  const holidayMap = {}
  yearHolidays.forEach(h => {
    const d = h.date?.split('T')[0] || h.date
    holidayMap[d] = h
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDayClick = (dateStr, existing) => {
    if (existing) {
      // Click on existing holiday → confirm remove
      if (window.confirm(`Remove holiday "${existing.name}" on ${formatFull(dateStr)}?`)) {
        handleRemove(existing.id)
      }
    } else {
      setModal({ date: dateStr })
    }
  }

  const handleAdded = (h) => {
    setHolidays(prev => [...prev, h].sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    ))
  }

  const handleRemove = async (id) => {
    setRemoving(id)
    try {
      const res = await api.delete(`/admin/holidays/${id}`)
      if (res.success) {
        setHolidays(prev => prev.filter(h => h.id !== id))
        toast.success('Holiday removed')
      } else { toast.error(res.message || 'Remove failed') }
    } catch { toast.error('Cannot connect to server') }
    setRemoving(null)
  }

  // Filtered list for sidebar
  const listItems = yearHolidays
    .filter(h => filter === 'all' || h.type === filter)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const counts = {
    all:      yearHolidays.length,
    national: yearHolidays.filter(h => h.type === 'national').length,
    company:  yearHolidays.filter(h => h.type === 'company').length,
    optional: yearHolidays.filter(h => h.type === 'optional').length,
  }

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Holiday Calendar
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {loading ? 'Loading…' : `${yearHolidays.length} holidays configured for ${year}`}
          </p>
        </div>

        {/* Year switcher */}
        <div className="flex items-center gap-2">
          <motion.button onClick={() => setYear(y => y - 1)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-dark-600
              flex items-center justify-center text-gray-500 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            <ChevronLeft size={16} />
          </motion.button>
          <div className="px-5 py-2 rounded-xl bg-primary-500 text-white font-bold text-sm shadow-md shadow-primary-500/25 min-w-[80px] text-center">
            {year}
          </div>
          <motion.button onClick={() => setYear(y => y + 1)}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-xl border border-gray-200 dark:border-dark-600
              flex items-center justify-center text-gray-500 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            <ChevronRight size={16} />
          </motion.button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Legend:</span>
        {HOLIDAY_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1.5 text-xs">
            <span className={`w-5 h-5 rounded-md ${typeStyle[t.value]} flex items-center justify-center text-[9px] font-bold`}>
              {new Date().getDate()}
            </span>
            <span className="text-gray-600 dark:text-gray-400">{t.label.replace(/^.+? /, '')}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="text-[10px]">Click date to add • Click holiday to remove</span>
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-5">

          {/* ── 12-month Calendar Grid ── */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }, (_, mi) => (
                <MonthGrid
                  key={mi}
                  year={year}
                  monthIdx={mi}
                  holidayMap={holidayMap}
                  onDayClick={handleDayClick}
                />
              ))}
            </div>
          </div>

          {/* ── Holiday List Sidebar ── */}
          <div className="xl:w-80 flex-shrink-0">
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-600 shadow-sm overflow-hidden sticky top-4">

              {/* Sidebar header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-600">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {year} Holidays
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{yearHolidays.length} total</p>
              </div>

              {/* Filter tabs */}
              <div className="flex border-b border-gray-100 dark:border-dark-600 overflow-x-auto">
                {[
                  { key: 'all',      label: `All (${counts.all})` },
                  { key: 'national', label: `Govt (${counts.national})` },
                  { key: 'company',  label: `Co. (${counts.company})` },
                  { key: 'optional', label: `Opt (${counts.optional})` },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)}
                    className={`flex-1 py-2 text-[11px] font-semibold transition-all whitespace-nowrap border-b-2 -mb-px ${
                      filter === tab.key
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="p-3 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                <AnimatePresence>
                  {listItems.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex flex-col items-center py-10 text-center">
                      <Calendar size={28} className="text-gray-300 dark:text-dark-500 mb-2" />
                      <p className="text-sm text-gray-400 font-medium">No holidays yet</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click any date on the calendar to add
                      </p>
                    </motion.div>
                  ) : (
                    listItems.map(h => (
                      <HolidayListItem
                        key={h.id}
                        h={h}
                        onRemove={handleRemove}
                        removing={removing}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Quick summary footer */}
              {yearHolidays.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-600 bg-gray-50/50 dark:bg-dark-700/50">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Working days (approx.)</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">
                      {365 - (yearHolidays.length + 52 + 52)} days
                    </span>
                  </div>
                  <div className="mt-1 flex gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
                      {counts.national} National
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {counts.company} Company
                    </span>
                    {counts.optional > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        {counts.optional} Optional
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Holiday Modal ── */}
      <AnimatePresence>
        {modal && (
          <AddModal
            date={modal.date}
            onClose={() => setModal(null)}
            onAdded={(h) => { handleAdded(h); setModal(null) }}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

export default AdminHolidayCalendar
