import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'

// ── Tab-close warning for checked-in employees ───────────────────────────────
// Shows a custom in-page modal when the employee's mouse leaves the browser
// chrome (heading toward the tab X / window close button) while checked in.
//
// Why not native beforeunload?
//   Chrome blocks custom messages and — worse — only shows the dialog ONCE
//   per page load. The second close attempt goes through silently.
//
// Why mouseleave on document?
//   When a user moves the cursor out of the page content area toward the
//   browser UI (tab bar, address bar, close button), document fires a
//   "mouseleave" event with clientY ≤ 0. This is the earliest signal we
//   can catch before the user actually clicks Close.
//
// The modal is purely in-app: it always re-appears, custom text works,
// and reload (F5) never triggers it.

const useCheckedInWarning = (isEmployee, onShowModal) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false)

  // Fetch today's attendance once on mount (only for employees)
  useEffect(() => {
    if (!isEmployee) return
    api.get('/attendance/today')
      .then(res => {
        if (res.success && res.data?.check_in && !res.data?.check_out) {
          setIsCheckedIn(true)
        }
      })
      .catch(() => {})
  }, [isEmployee])

  // Listen for check-in / check-out events from AuthContext
  useEffect(() => {
    if (!isEmployee) return
    const onCheckIn  = () => setIsCheckedIn(true)
    const onCheckOut = () => setIsCheckedIn(false)
    window.addEventListener('epip:checked-in',  onCheckIn)
    window.addEventListener('epip:checked-out', onCheckOut)
    return () => {
      window.removeEventListener('epip:checked-in',  onCheckIn)
      window.removeEventListener('epip:checked-out', onCheckOut)
    }
  }, [isEmployee])

  // Mouse-leave trap — fires when cursor exits the page toward browser chrome
  useEffect(() => {
    if (!isCheckedIn) return

    const handleMouseLeave = (e) => {
      // clientY <= 0 means cursor moved up into the tab bar / title bar area
      // clientX < 0 means exited left (back button area)
      // Only trigger when heading UP toward the tab/close button
      if (e.clientY <= 0) {
        onShowModal()
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [isCheckedIn, onShowModal])

  // Keep beforeunload as a safety net for keyboard shortcuts (Ctrl+W, Alt+F4)
  // Re-register every time so Chrome's one-time block is bypassed
  // Also sends sendBeacon on actual close to close the session immediately
  useEffect(() => {
    if (!isCheckedIn) return

    const handleBeforeUnload = (e) => {
      const navEntry = performance.getEntriesByType?.('navigation')?.[0]
      const isReload =
        navEntry?.type === 'reload' ||
        performance?.navigation?.type === 1
      if (isReload) return

      // ── sendBeacon: close session immediately on tab/window close ──────────
      // This fires synchronously before the page unloads — browser guarantees delivery
      const token = localStorage.getItem('epip_token')
      if (token) {
        const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
          ? import.meta.env.VITE_API_URL
          : `${window.location.protocol}//${window.location.hostname.includes(':') ? `[${window.location.hostname}]` : window.location.hostname}:5000/api`

        // Send checkout via sendBeacon (non-blocking, guaranteed delivery)
        const blob = new Blob(
          [JSON.stringify({ tab_close: true, _token: token })],
          { type: 'application/json' }
        )
        navigator.sendBeacon?.(`${baseUrl}/attendance/check-out`, blob)

        // Clear session from localStorage so next Chrome open shows login page
        localStorage.removeItem('epip_token')
        localStorage.removeItem('epip_user')
      }

      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isCheckedIn])
}

// ── CRM Running Warning Modal ─────────────────────────────────────────────────
const CRMWarningModal = ({ isOpen, onStay }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop — NOT clickable to close, employee must choose */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{   opacity: 0, scale: 0.88, y: 24  }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-sm bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-600 overflow-hidden"
        >
          {/* Red top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />

          <div className="p-6 text-center">
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Your CRM Application is Running
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              You are currently checked in. Closing this tab will end your active session.<br />
              <span className="font-semibold text-orange-500">Please do not close this tab.</span>
            </p>

            {/* Single button — go back */}
            <button
              onClick={onStay}
              className="w-full py-3 px-6 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors shadow-lg shadow-primary-500/25"
            >
              OK, I'll Stay
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
)

const DashboardLayout = () => {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCRMWarning, setShowCRMWarning] = useState(false)
  const { user } = useAuth()

  // Show custom warning modal when checked-in employee moves cursor to close button
  useCheckedInWarning(user?.role === 'employee', () => setShowCRMWarning(true))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">

      {/* CRM running warning modal — shown when cursor heads to browser close area */}
      <CRMWarningModal
        isOpen={showCRMWarning}
        onStay={() => setShowCRMWarning(false)}
      />

      {/* Mobile backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full z-40 transition-transform duration-300
        lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Main */}
      <div className={`
        flex-1 flex flex-col min-h-screen overflow-x-hidden w-full
        lg:transition-all lg:duration-300
        ${collapsed ? 'lg:ml-16' : 'lg:ml-64'}
      `}>
        <Navbar onMenuToggle={() => setMobileOpen(o => !o)} />

        <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
