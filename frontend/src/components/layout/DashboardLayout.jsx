import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { startCapture, stopCapture } from '../../services/screenshotCaptureService'
import { api } from '../../services/api'

const DashboardLayout = () => {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()

  // Auto-capture screenshots for employees only
  useEffect(() => {
    if (user?.role !== 'employee') return

    // Get screenshot interval from settings (default 10 min)
    api.get('/admin/settings').then(res => {
      const interval = parseInt(res.data?.screenshot_interval_minutes || res.data?.screenshot_interval || 10)
      startCapture(interval)
    }).catch(() => {
      startCapture(10) // default 10 min
    })

    return () => stopCapture()
  }, [user?.role])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">

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
