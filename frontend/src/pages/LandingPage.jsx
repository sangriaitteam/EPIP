import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, Camera, Shield, Clock, TrendingUp,
  Target, FileText, FolderOpen, Bell, CheckSquare,
  Building2, CheckCircle, ChevronRight, ArrowRight,
  UserCheck, CalendarDays, ScanFace, Layers,
  Monitor, Settings, Globe
} from 'lucide-react'
import ThemeToggle from '../components/common/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import sangriaLogo from '../assets/sangria-logo.png'

// ── EPIP Actual Features (what's really built) ────────────────────────────
const features = [
  {
    icon: Clock,
    title: 'Smart Attendance Tracking',
    desc: 'Employees check in/out with automatic break tracking, overtime calculation, and late arrival detection. Real-time attendance visible to HR.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Camera,
    title: 'Desktop Screenshot Agent',
    desc: 'Lightweight Electron desktop agent captures screenshots at configurable intervals during work hours. Auto-starts on check-in, stops on check-out.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Target,
    title: 'Goal & KPI Management',
    desc: 'Employees set monthly, quarterly, and annual goals with KPI metrics. HR approves or rejects goals. Full progress tracking with completion percentage.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: FolderOpen,
    title: 'Project Management',
    desc: 'Project Managers create and manage projects with Kanban boards, assign team members, track task completion, and monitor project progress.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: CheckSquare,
    title: 'Task Management',
    desc: 'Assign tasks with priority levels (Low/Medium/High/Urgent), due dates, and status tracking (To Do → In Progress → Review → Done).',
    color: 'from-pink-500 to-fuchsia-500',
  },
  {
    icon: FileText,
    title: 'Reports & Analytics',
    desc: 'HR generates attendance, performance, and leave reports. PDF export with company branding. Department-wise and individual employee analytics.',
    color: 'from-red-500 to-rose-500',
  },
  {
    icon: UserCheck,
    title: 'Employee Verification',
    desc: 'New employees upload Aadhaar, PAN, educational certificates, and experience letters. HR verifies documents and approves onboarding.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    desc: 'Employees submit leave requests with type and reason. HR approves or rejects with holiday calendar integration for accurate working day calculation.',
    color: 'from-indigo-500 to-blue-500',
  },
]

// ── EPIP Actual Modules ───────────────────────────────────────────────────
const modules = [
  'Employee Management',
  'Attendance Tracking',
  'Break / Pause Tracking',
  'Overtime Calculation',
  'Desktop Agent (Electron)',
  'Screenshot Capture',
  'Task Management',
  'Project Management',
  'Project Kanban Board',
  'Goal Management (KPI)',
  'Leave Requests',
  'Holiday Calendar',
  'HR Dashboard',
  'Admin Dashboard',
  'Employee Dashboard',
  'PM Dashboard',
  'Reports & PDF Export',
  'Document Verification',
  'Department Management',
  'Roles & Permissions',
  'Notifications (Real-time)',
  'Admin Settings',
  'Screenshot Viewer (HR)',
  'Profile Management',
]

// ── EPIP Actual Roles ─────────────────────────────────────────────────────
const roles = [
  {
    name: 'Super Admin',
    desc: 'Full system access. Manages departments, roles, permissions, holiday calendar, admin settings, and creates HR/Project Manager accounts.',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
  },
  {
    name: 'HR Admin',
    desc: 'Manages all employees — attendance monitoring, leave approvals, document verification, report generation, and screenshot review.',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Project Manager',
    desc: 'Creates and manages projects with Kanban boards, assigns tasks to team members, tracks completion percentage, and views team performance.',
    icon: FolderOpen,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    name: 'Employee',
    desc: 'Checks in/out, manages personal profile, views assigned tasks and projects, sets goals, submits leave requests, and uses the desktop agent.',
    icon: UserCheck,
    color: 'from-orange-500 to-amber-600',
  },
]

const PROGRESS_ITEMS = [
  { label: 'Attendance Rate',   value: 95, color: 'from-blue-500 to-cyan-400' },
  { label: 'Goal Completion',   value: 78, color: 'from-emerald-500 to-teal-400' },
  { label: 'Task Completion',   value: 82, color: 'from-violet-500 to-purple-400' },
]

export default function LandingPage() {
  const navigate  = useNavigate()
  const canvasRef = useRef(null)
  const { theme } = useTheme()
  const isDark    = theme === 'dark'

  // ── Particle canvas ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5, alpha: Math.random() * 0.5 + 0.1,
    }))
    let animId
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`; ctx.fill()
      })
      particles.forEach((a, i) => particles.slice(i + 1).forEach(b => {
        const d = Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2)
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `rgba(99,102,241,${0.12*(1-d/120)})`
          ctx.lineWidth = 0.5; ctx.stroke()
        }
      }))
      animId = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  // ── Theme classes ────────────────────────────────────────────────────────
  const bg         = isDark ? 'bg-slate-950'  : 'bg-slate-50'
  const textBase   = isDark ? 'text-white'    : 'text-black'
  const textMuted  = isDark ? 'text-slate-400': 'text-slate-800'
  const glassCls   = isDark
    ? 'bg-white/5 backdrop-blur-md border border-white/10'
    : 'bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm'
  const navBorder  = isDark ? 'border-white/5'  : 'border-slate-300'
  const gridBg     = isDark ? 'bg-slate-900'    : 'bg-white'
  const statCard   = isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-sm'
  const moduleCard = isDark
    ? 'bg-white/5 border border-transparent hover:border-blue-500/50'
    : 'bg-white border border-slate-300 hover:border-blue-400'
  const progressBg = isDark ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'

  return (
    <div className={`min-h-screen ${bg} ${textBase} overflow-x-hidden transition-colors duration-300`}>

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: isDark ? 1 : 0.1 }} />

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav className={`relative z-10 flex items-center justify-between px-4 md:px-10 py-3 sm:py-4 ${glassCls} border-b ${navBorder} sticky top-0`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={sangriaLogo} alt="Sangria Edutainment" className={`h-8 sm:h-10 w-auto object-contain flex-shrink-0 ${isDark ? 'brightness-0 invert' : ''}`} />
        </div>

        <div className={`hidden md:flex items-center gap-8 text-sm ${textMuted}`}>
          {['Features', 'Modules', 'Roles', 'Tech Stack'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
              className="hover:text-blue-500 transition-colors">{item}</a>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <button onClick={() => navigate('/login')}
            className={`hidden sm:block text-sm px-3 sm:px-4 py-2 rounded-xl font-medium transition-all border
              ${isDark ? 'border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'
                : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-500 bg-white'}`}>
            Sign In
          </button>
          <button onClick={() => navigate('/login')}
            className="text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25 whitespace-nowrap">
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <Monitor size={14} /> Employee Performance Intelligence Platform
            </span>

            <h1 className={`text-3xl sm:text-5xl md:text-7xl font-black leading-tight mb-6 ${textBase}`}>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">EPIP</span>
              <br />
              <span className={`text-2xl sm:text-4xl md:text-5xl font-bold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                Employee Performance
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                Intelligence Platform
              </span>
            </h1>

            <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-900'} max-w-3xl mx-auto mb-4 leading-relaxed`}>
              A complete HR management system built for <strong className="text-blue-400">Sangria Edutainment Pvt Ltd</strong> —
              tracking attendance, managing projects, monitoring performance, and keeping your entire
              workforce aligned and productive.
            </p>

            {/* Definition box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className={`inline-block max-w-2xl mx-auto mb-10 px-5 py-3 rounded-2xl text-sm text-left border
                ${isDark ? 'bg-blue-500/5 border-blue-500/20 text-slate-300' : 'bg-blue-50 border-blue-200 text-slate-900'}`}
            >
              <span className="font-semibold text-blue-400">EPIP Definition: </span>
              An integrated web + desktop platform that enables real-time attendance tracking, screenshot-based
              productivity monitoring, goal & KPI management, project management with Kanban boards,
              leave management, and role-based dashboards for employees, HR, Project Managers, and Super Admins.
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button onClick={() => navigate('/login')}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 justify-center text-base py-4 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
                Sign In to EPIP <ArrowRight size={18} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className={`flex items-center gap-2 justify-center text-base py-4 px-8 rounded-2xl font-semibold transition-all border
                  ${isDark ? 'border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400 bg-white/5'
                    : 'border-slate-200 text-slate-600 hover:border-blue-400 bg-white shadow-sm'}`}>
                <Layers size={18} className="text-blue-400" /> Explore Features
              </motion.button>
            </div>
          </motion.div>

          {/* Live dashboard preview */}
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }} className="mt-20">
            <div className={`rounded-3xl p-1 mx-auto max-w-5xl border shadow-2xl
              ${isDark ? 'border-blue-500/20 shadow-blue-500/10' : 'border-blue-200 shadow-blue-100'}`}
              style={{ background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)' }}>
              <div className={`${gridBg} rounded-3xl p-6`}>
                {/* Key metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { value: '4',      label: 'User Roles',         sub: 'Admin · HR · PM · Employee' },
                    { value: '24',     label: 'Core Modules',       sub: 'Fully integrated' },
                    { value: '100%',   label: 'Web + Desktop',      sub: 'React + Electron' },
                    { value: 'Docker', label: 'Deploy Ready',       sub: 'nginx + PostgreSQL' },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 + i * 0.1 }}
                      className={`${statCard} rounded-2xl p-4 text-center`}>
                      <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                        {s.value}
                      </div>
                      <div className={`text-xs font-semibold ${textBase} mt-1`}>{s.label}</div>
                      <div className={`text-[10px] ${textMuted} mt-0.5`}>{s.sub}</div>
                    </motion.div>
                  ))}
                </div>
                {/* Progress bars */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PROGRESS_ITEMS.map((item, i) => (
                    <div key={i} className={`${progressBg} rounded-xl p-4`}>
                      <div className={`text-xs ${textMuted} mb-2`}>{item.label}</div>
                      <div className={`h-2 rounded-full w-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.5, delay: 1 + i * 0.2, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${item.color}`} />
                      </div>
                      <div className={`text-sm font-bold mt-1 ${textBase}`}>{item.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>



      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 block">Core Features</span>
            <h2 className={`text-2xl sm:text-4xl font-black mb-4 ${textBase}`}>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Built for Real
              </span>{' '}
              Workflows
            </h2>
            <p className={`${textMuted} max-w-xl mx-auto`}>
              Every feature is designed around actual HR and employee needs — not just checkboxes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }} whileHover={{ y: -6, scale: 1.02 }}
                className={`${glassCls} rounded-2xl p-6 group cursor-default`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className={`font-bold mb-2 text-sm ${textBase}`}>{f.title}</h3>
                <p className={`text-xs ${textMuted} leading-relaxed`}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ──────────────────────────────────────────────────────────── */}
      <section id="roles" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 block">User Roles</span>
            <h2 className={`text-2xl sm:text-4xl font-black mb-4 ${textBase}`}>
              Built for{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Every Role
              </span>
            </h2>
            <p className={`${textMuted}`}>
              4 distinct roles with dedicated dashboards and tailored permissions
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} whileHover={{ y: -4, scale: 1.02 }}
                className={`${glassCls} rounded-2xl p-6 text-center cursor-default`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <role.icon size={26} className="text-white" />
                </div>
                <h3 className={`font-bold text-sm mb-2 ${textBase}`}>{role.name}</h3>
                <p className={`text-xs ${textMuted} leading-relaxed`}>{role.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES GRID ───────────────────────────────────────────────────── */}
      <section id="modules" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3 block">Module Suite</span>
            <h2 className={`text-2xl sm:text-4xl font-black ${textBase}`}>
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">24 Modules</span>
              {' '}— All Included
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {modules.map((mod, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`${moduleCard} rounded-xl p-3.5 flex items-center gap-3 transition-all duration-300 group`}>
                <CheckCircle size={15} className="text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className={`text-xs ${textMuted} group-hover:text-blue-500 transition-colors`}>{mod}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* ── DESKTOP AGENT CALLOUT ───────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            className={`${glassCls} rounded-3xl p-8 sm:p-12 border
              ${isDark ? 'border-violet-500/20' : 'border-violet-200'}`}>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <ScanFace size={40} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className={`text-xl sm:text-2xl font-black mb-3 ${textBase}`}>EPIP Desktop Agent</h3>
                <p className={`${textMuted} text-sm leading-relaxed mb-4`}>
                  A lightweight <strong className={textBase}>Windows desktop application</strong> that runs in the system tray.
                  It automatically begins screenshot capture when an employee checks in and stops when they check out.
                  The interval is configurable by Super Admin and applied in real-time. Captures active window title
                  for context alongside each screenshot.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Windows System Tray', 'Auto check-in detection', 'Configurable interval', 'Active window tracking', 'Pause / Resume', 'Auto-start on login'].map(tag => (
                    <span key={tag} className={`text-xs px-3 py-1 rounded-full border font-medium
                      ${isDark ? 'border-violet-500/30 text-violet-300 bg-violet-500/10' : 'border-violet-200 text-violet-600 bg-violet-50'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`max-w-4xl mx-auto ${glassCls} rounded-3xl p-8 sm:p-12 text-center border shadow-2xl
            ${isDark ? 'border-blue-500/20 shadow-blue-500/10' : 'border-blue-200 shadow-blue-100'}`}>
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className={`text-2xl sm:text-4xl font-black mb-4 ${textBase}`}>
            Sangria Edutainment's<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Internal HR Platform
            </span>
          </h2>
          <p className={`${textMuted} text-sm sm:text-base mb-8 max-w-lg mx-auto`}>
            EPIP is purpose-built for Sangria Edutainment Pvt Ltd — managing employees, tracking performance,
            and keeping teams productive across all departments.
          </p>
          <motion.button onClick={() => navigate('/login')}
            whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-base py-4 px-10 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
            Sign In to EPIP <ChevronRight size={20} />
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className={`relative z-10 border-t py-8 px-6 text-center text-sm
        ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={sangriaLogo} alt="Sangria" className={`h-7 w-auto object-contain ${isDark ? 'brightness-0 invert' : ''}`} />
        </div>
        <p>© 2026 Sangria Edutainment Pvt Ltd · Employee Performance Intelligence Platform</p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
          EPIP v1.0 · React + Node.js + PostgreSQL + Electron
        </p>
      </footer>
    </div>
  )
}
