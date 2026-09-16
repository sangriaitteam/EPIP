import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Clock, CheckSquare, Target,
  FileText, Settings, LogOut, ChevronRight, ChevronDown,
  Camera, Shield, Building2, Calendar, Star, FolderOpen
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils/helpers'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'
import sangriaLogo from '../../assets/sangria-logo.png'

// ── Nav config ────────────────────────────────────────────────────────────
const navConfig = {
  admin: [
    { label: 'Dashboard',     icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Projects',      icon: FolderOpen,      path: '/admin/projects' },
    { label: 'Departments',   icon: Building2,       path: '/admin/departments' },
    { label: 'Roles & Perms', icon: Shield,          path: '/admin/roles' },
    { label: 'Holiday Cal.',  icon: Calendar,        path: '/admin/holidays' },
    { label: 'Settings',      icon: Settings,        path: '/admin/settings' },
  ],
  hr: [
    { label: 'Dashboard',          icon: LayoutDashboard, path: '/hr/dashboard' },
    { label: 'My Profile',         icon: Users,           path: '/hr/profile' },
    { label: 'Employees',          icon: Users,           path: '/hr/employees' },
    { label: "Today's Attendance", icon: Clock,           path: '/hr/attendance' },
    { label: 'Assign Tasks',       icon: CheckSquare,     path: '/hr/tasks' },
    { label: 'Leave Requests',     icon: Calendar,        path: '/hr/leaves' },
    { label: 'Performance',        icon: Star,            path: '/hr/performance' },
    { label: 'Reports',            icon: FileText,        path: '/hr/reports' },
    { label: 'Screenshots',        icon: Camera,          path: '/hr/screenshots' },
  ],
  employee: [
    { label: 'Dashboard',       icon: LayoutDashboard, path: '/employee/dashboard' },
    { label: 'My Profile',      icon: Users,           path: '/employee/profile' },
    { label: 'Attendance',      icon: Clock,           path: '/employee/attendance' },
    { label: 'My Tasks',        icon: CheckSquare,     path: '/employee/tasks' },
    { label: 'Goals / KPIs',    icon: Target,          path: '/employee/goals' },
  ],
}

const navItemVariants = {
  hidden:  { opacity: 0, x: -20 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 200, damping: 20 }
  }),
}

const Sidebar = ({ collapsed, onToggle, onClose }) => {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const location         = useLocation()
  const navItems         = navConfig[user?.role] || []
  const [openGroups, setOpenGroups] = useState(['Projects','My Projects']) // open by default

  const toggleGroup = (label) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
      <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-full flex flex-col overflow-hidden bg-white dark:bg-dark-800 border-r border-gray-100 dark:border-dark-600 shadow-xl shadow-black/5 dark:shadow-black/30"
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-gray-100 dark:border-dark-600 flex-shrink-0',
        collapsed ? 'justify-center px-3' : 'px-5 gap-3'
      )}>
        <motion.div
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6 }}
          className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg"
        >
          <img src={sangriaLogo} alt="Sangria" className="w-full h-full object-contain" />
        </motion.div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <p className="font-bold text-gray-900 dark:text-white text-sm">Sangria</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Edutainment</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User info */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b border-gray-100 dark:border-dark-600 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-dark-700">
              <Avatar name={user?.name} src={user?.avatar_url || user?.employee?.avatar_url} size="sm" online={true} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {user?.role === 'admin' ? 'Super Admin' : user?.role === 'hr' ? 'Admin' : 'Employee'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-1">
          {navItems.map((item, i) => (
            <motion.div key={item.label} custom={i} variants={navItemVariants} initial="hidden" animate="visible">

              {/* ── Group item (has children) ── */}
              {item.children ? (
                <div>
                  <button
                    onClick={() => !collapsed && toggleGroup(item.label)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl transition-colors duration-200 group relative',
                      collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
                      item.children.some(c => location.pathname.startsWith(c.path))
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <motion.div whileHover={{ scale: 1.2, rotate: 8 }} transition={{ type:'spring', stiffness:400, damping:15 }} className="flex-shrink-0">
                      <item.icon size={18} className={item.children.some(c => location.pathname.startsWith(c.path)) ? 'text-primary-500' : ''} />
                    </motion.div>
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-5 }}
                          className="text-sm font-medium truncate flex-1 text-left">
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && (
                      <motion.div animate={{ rotate: openGroups.includes(item.label) ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                      </motion.div>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 dark:bg-dark-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                        {item.label}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-dark-600 rotate-45" />
                      </div>
                    )}
                  </button>

                  {/* Children */}
                  <AnimatePresence>
                    {!collapsed && openGroups.includes(item.label) && (
                      <motion.div
                        initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                        exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }}
                        className="overflow-hidden ml-3 pl-3 border-l-2 border-gray-100 dark:border-dark-600 mt-0.5 space-y-0.5"
                      >
                        {item.children.map(child => (
                          <NavLink key={child.path} to={child.path} onClick={() => onClose?.()}
                            className={({ isActive }) => cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                              isActive
                                ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-800 dark:hover:text-white'
                            )}
                          >
                            <child.icon size={15} />
                            <span className="truncate">{child.label}</span>
                          </NavLink>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* ── Regular nav item ── */
                <NavLink
                  to={item.path}
                  onClick={() => onClose?.()}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-xl transition-colors duration-200 group relative overflow-hidden',
                    collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span layoutId="activeNav"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full"
                          transition={{ type:'spring', stiffness:300, damping:30 }} />
                      )}
                      {isActive && (
                        <motion.div layoutId="activeBg"
                          className="absolute inset-0 bg-primary-500/8 rounded-xl"
                          transition={{ type:'spring', stiffness:300, damping:30 }} />
                      )}
                      <motion.div whileHover={{ scale:1.2, rotate:8 }} whileTap={{ scale:0.9 }}
                        transition={{ type:'spring', stiffness:400, damping:15 }}
                        className="relative z-10 flex-shrink-0">
                        <item.icon size={18} className={isActive ? 'text-primary-500' : ''} />
                      </motion.div>
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span initial={{ opacity:0, x:-5 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-5 }}
                            className="text-sm font-medium truncate relative z-10">
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 dark:bg-dark-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                          {item.label}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 dark:bg-dark-600 rotate-45" />
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              )}
            </motion.div>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-gray-100 dark:border-dark-600">
        <motion.button
          onClick={handleLogout}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-red-500 hover:bg-red-500/10 transition-colors',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Toggle — desktop only */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9, rotate: 180 }}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-full items-center justify-center shadow-md hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors z-50"
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronRight size={12} className="text-gray-500 dark:text-gray-400" />
        </motion.div>
      </motion.button>
    </motion.aside>
  )
}

export default Sidebar
