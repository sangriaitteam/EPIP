import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3, Users, Camera, Shield, Clock, TrendingUp,
  Target, FileText, FolderOpen, Bell, CheckSquare,
  Building2, CheckCircle, ChevronRight, ArrowRight,
  UserCheck, CalendarDays, ScanFace, Layers,
  Monitor, Settings, Globe, ChevronDown,
  Zap, Database, Layout, PhoneCall, Mail,
  Briefcase, Star, PieChart, Handshake
} from 'lucide-react'
import ThemeToggle from '../components/common/ThemeToggle'
import { useTheme } from '../context/ThemeContext'
import sangriaLogo from '../assets/sangria.png'

// ── CRM Features ──────────────────────────────────────────────────────────
const features = [
  {
    icon: PhoneCall,
    title: 'Lead & Client Management',
    desc: 'Capture leads, track client interactions, manage follow-ups, and move prospects through your sales pipeline with real-time status updates.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Clock,
    title: 'Smart Attendance & Time',
    desc: 'Employees check in/out with automatic break tracking, overtime calculation, screen-lock detection, and late arrival monitoring.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Handshake,
    title: 'Deal Pipeline & Follow-ups',
    desc: 'Visual deal pipeline from first contact to closure. Schedule follow-up calls, set reminders, and never miss a client opportunity.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: FolderOpen,
    title: 'Project Management',
    desc: 'Project Managers create and manage client projects with Kanban boards, assign team members, and track delivery milestones.',
    color: 'from-orange-500 to-amber-500',
  },
  {
    icon: CheckSquare,
    title: 'Task & Activity Tracking',
    desc: 'Assign tasks with priority levels, due dates, and per-task chat threads. Full activity history per client and per employee.',
    color: 'from-pink-500 to-fuchsia-500',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'HR and sales reports — attendance, performance, client acquisition, revenue pipeline. PDF export with company branding.',
    color: 'from-red-500 to-rose-500',
  },
  {
    icon: UserCheck,
    title: 'Employee Management',
    desc: 'Full employee lifecycle — onboarding, document verification, attendance, leave, skills, and performance tracking in one place.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Camera,
    title: 'Productivity Monitoring',
    desc: 'Desktop agent captures screenshots at configurable intervals during work hours. HR can review activity and identify idle time.',
    color: 'from-indigo-500 to-blue-500',
  },
]

// ── Modules ───────────────────────────────────────────────────────────────
const modules = [
  'Lead Management',
  'Client Profiles',
  'Deal Pipeline',
  'Follow-up Scheduler',
  'Employee Management',
  'Attendance Tracking',
  'Break / Pause Tracking',
  'Leave Management',
  'Task Management',
  'Project Kanban Board',
  'Task Chat',
  'Screenshot Monitor',
  'HR Dashboard',
  'CRM Dashboard',
  'Admin Dashboard',
  'PM Dashboard',
  'Reports & PDF Export',
  'Document Verification',
  'Department Management',
  'Roles & Permissions',
  'Notifications',
  'ID Card Generator',
  'Holiday Calendar',
  'Audit Logs',
]

// ── Roles ─────────────────────────────────────────────────────────────────
const roles = [
  {
    name: 'Super Admin',
    desc: 'Full system access — manages departments, roles, permissions, settings, holidays, and oversees both HR and CRM operations.',
    icon: Shield,
    color: 'from-red-500 to-rose-600',
  },
  {
    name: 'HR Admin',
    desc: 'Manages employees — attendance monitoring, leave approvals, document verification, payroll reporting, and screenshot review.',
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Project Manager',
    desc: 'Creates and manages client projects with Kanban boards, assigns tasks, tracks delivery progress, and communicates with teams.',
    icon: FolderOpen,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    name: 'Employee',
    desc: 'Checks in/out, manages tasks, views assigned projects, updates client follow-ups, submits leave requests, and uses the desktop agent.',
    icon: UserCheck,
    color: 'from-orange-500 to-amber-600',
  },
]

const PROGRESS_ITEMS = [
  { label: 'Client Retention',   value: 92, color: 'from-blue-500 to-cyan-400' },
  { label: 'Task Completion',    value: 87, color: 'from-emerald-500 to-teal-400' },
  { label: 'Attendance Rate',    value: 95, color: 'from-violet-500 to-purple-400' },
]

// ── Products dropdown ─────────────────────────────────────────────────────
const PRODUCTS_MENU = [
  { label: 'Sales',                      anchor: '#features' },
  { label: 'Marketing',                  anchor: '#features' },
  { label: 'Finance',                    anchor: '#features' },
  { label: 'Human Resources',            anchor: '#features' },
  { label: 'Security and IT Management', anchor: '#features' },
  { label: 'BI and Analytics',           anchor: '#features' },
  { label: 'Project Management',         anchor: '#features' },
  { label: 'Developer Platforms',        anchor: '#tech-stack' },
]

// ── Tech Stack data ───────────────────────────────────────────────────────
const techStack = [
  { category: 'Frontend',  color: 'from-blue-500 to-cyan-500',    icon: Layout,   items: ['React 18', 'Vite 5', 'Tailwind CSS', 'Framer Motion', 'Recharts', 'React Router v6'] },
  { category: 'Backend',   color: 'from-emerald-500 to-teal-500', icon: Globe,    items: ['Node.js', 'Express.js', 'node-postgres', 'JWT Auth', 'Multer', 'Nodemailer'] },
  { category: 'Database',  color: 'from-orange-500 to-amber-500', icon: Database, items: ['PostgreSQL 17', 'Raw SQL', '33 Migrations', 'Supabase ready', 'pg Pool', 'Indexes'] },
  { category: 'Desktop',   color: 'from-violet-500 to-purple-500',icon: Monitor,  items: ['Electron 29', 'desktopCapturer', 'powerMonitor', 'System Tray', 'Deep-links', 'NSIS installer'] },
  { category: 'DevOps',    color: 'from-red-500 to-rose-500',     icon: Settings, items: ['Docker Compose', 'nginx', 'Railway (API)', 'Vercel (UI)', 'Multi-stage build', 'Health checks'] },
]

// ── Zoho-style Product Dropdown ───────────────────────────────────────────
const ProductDropdown = ({ isDark, onClose }) => {
  return (
    <div style={{ padding: '8px 0 0 0' }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
        {PRODUCTS_MENU.map((item, i) => (
          <li key={i}>
            <a
              href={item.anchor}
              onClick={onClose}
              style={{
                display: 'block',
                padding: '10px 20px',
                fontSize: '14px',
                color: isDark ? '#cbd5e1' : '#374151',
                textDecoration: 'none',
                transition: 'background 0.12s, color 0.12s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = isDark ? 'rgba(99,102,241,0.1)' : '#f0f7ff'
                e.currentTarget.style.color = isDark ? '#818cf8' : '#2563eb'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = isDark ? '#cbd5e1' : '#374151'
              }}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <div style={{
        padding: '12px 16px',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb',
        marginTop: '4px',
      }}>
        <a
          href="#features"
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: '#1d6ae5', color: '#ffffff', textDecoration: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1558c0' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1d6ae5' }}
        >
          EXPLORE ALL FEATURES <ChevronRight size={15} />
        </a>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const navigate  = useNavigate()
  const canvasRef = useRef(null)
  const { theme } = useTheme()
  const isDark    = theme === 'dark'
  const [productOpen, setProductOpen] = useState(false)
  const productRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (productRef.current && !productRef.current.contains(e.target)) setProductOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  const bg         = isDark ? 'bg-slate-950'  : 'bg-slate-50'
  const textBase   = isDark ? 'text-white'    : 'text-black'
  const textMuted  = isDark ? 'text-slate-400': 'text-slate-800'
  const glassCls   = isDark
    ? 'bg-white/5 backdrop-blur-md border border-white/10'
    : 'bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm'
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

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav
        className="relative flex items-center justify-between px-4 md:px-10 py-3 sm:py-4 sticky top-0"
        style={{
          zIndex: 1000,
          background: isDark ? '#0f172a' : '#ffffff',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0',
          boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {/* Left: Logo + Products */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img src={sangriaLogo} alt="Sangria" className="h-8 sm:h-10 w-auto object-contain flex-shrink-0" />
            <span className={`font-bold text-sm hidden sm:block ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Sangria <span className={`font-normal text-xs block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Edutainment</span>
            </span>
          </div>

          {/* Products dropdown */}
          <div className={`hidden md:flex items-center text-sm ml-[8vw] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <div className="relative" ref={productRef}>
              <button
                onClick={() => setProductOpen(o => !o)}
                className={`flex items-center gap-1.5 font-medium transition-colors px-1 py-1 ${
                  productOpen
                    ? 'text-blue-500'
                    : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                Products
                <ChevronDown size={14} className={`transition-transform duration-200 ${productOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {productOpen && (
                  <>
                    <div className="fixed inset-0 z-[998]" onClick={() => setProductOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-0 top-[calc(100%+12px)] z-[999] w-[280px] rounded-2xl overflow-hidden"
                      style={{
                        background: isDark ? '#0f172a' : '#ffffff',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <ProductDropdown isDark={isDark} onClose={() => setProductOpen(false)} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button onClick={() => navigate('/login')}
            className={`hidden sm:block text-sm px-4 py-2 rounded-xl font-medium transition-all border ${
              isDark
                ? 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-blue-400'
                : 'border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 bg-white'
            }`}>
            Sign In
          </button>
          <button onClick={() => navigate('/login')}
            className="text-xs sm:text-sm px-4 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25 whitespace-nowrap">
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <Monitor size={14} /> HR + CRM — All in One Platform
            </span>

            <h1 className={`text-3xl sm:text-5xl md:text-7xl font-black leading-tight mb-6 ${textBase}`}>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Sangria</span>
              <br />
              <span className={`text-2xl sm:text-4xl md:text-5xl font-bold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                Edutainment
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                CRM Platform
              </span>
            </h1>

            <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-900'} max-w-3xl mx-auto mb-4 leading-relaxed`}>
              A unified <strong className="text-blue-400">HR + CRM platform</strong> built for{' '}
              <strong className="text-blue-400">Sangria Edutainment Pvt Ltd</strong> —
              manage your employees, track clients, monitor performance, and grow your business from a single dashboard.
            </p>

            {/* Two-panel highlight */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-10"
            >
              <div className={`px-5 py-4 rounded-2xl text-left border ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-blue-400" />
                  <span className="font-bold text-sm text-blue-400">HR Management</span>
                </div>
                <p className={`text-xs ${textMuted}`}>Attendance, leaves, payroll reports, document verification, employee profiles, and productivity monitoring.</p>
              </div>
              <div className={`px-5 py-4 rounded-2xl text-left border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Handshake size={16} className="text-emerald-400" />
                  <span className="font-bold text-sm text-emerald-400">Client Management</span>
                </div>
                <p className={`text-xs ${textMuted}`}>Lead tracking, deal pipeline, follow-up scheduling, client profiles, and sales activity reports.</p>
              </div>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button onClick={() => navigate('/login')}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 justify-center text-base py-4 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
                Sign In to CRM <ArrowRight size={18} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className={`flex items-center gap-2 justify-center text-base py-4 px-8 rounded-2xl font-semibold transition-all border ${
                  isDark ? 'border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400 bg-white/5'
                    : 'border-slate-200 text-slate-600 hover:border-blue-400 bg-white shadow-sm'}`}>
                <Layers size={18} className="text-blue-400" /> Explore Features
              </motion.button>
            </div>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }} className="mt-20">
            <div className={`rounded-3xl p-1 mx-auto max-w-5xl border shadow-2xl ${isDark ? 'border-blue-500/20 shadow-blue-500/10' : 'border-blue-200 shadow-blue-100'}`}
              style={{ background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)' }}>
              <div className={`${gridBg} rounded-3xl p-6`}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { value: '2-in-1',  label: 'HR + CRM',            sub: 'One unified platform'     },
                    { value: '4',       label: 'User Roles',           sub: 'Admin · HR · PM · Employee' },
                    { value: '24+',     label: 'Core Modules',         sub: 'Fully integrated'         },
                    { value: 'Docker',  label: 'Deploy Ready',         sub: 'nginx + PostgreSQL'       },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 + i * 0.1 }}
                      className={`${statCard} rounded-2xl p-4 text-center`}>
                      <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">{s.value}</div>
                      <div className={`text-xs font-semibold ${textBase} mt-1`}>{s.label}</div>
                      <div className={`text-[10px] ${textMuted} mt-0.5`}>{s.sub}</div>
                    </motion.div>
                  ))}
                </div>
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

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 block">Core Features</span>
            <h2 className={`text-2xl sm:text-4xl font-black mb-4 ${textBase}`}>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">HR + CRM</span>
              {' '}Built Together
            </h2>
            <p className={`${textMuted} max-w-xl mx-auto`}>
              One platform to manage your people and your clients — no switching tools
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

      {/* ── ROLES ────────────────────────────────────────────────────────── */}
      <section id="roles" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 block">User Roles</span>
            <h2 className={`text-2xl sm:text-4xl font-black mb-4 ${textBase}`}>
              Built for{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Every Role</span>
            </h2>
            <p className={`${textMuted}`}>4 distinct roles with dedicated dashboards and tailored permissions</p>
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

      {/* ── MODULES GRID ─────────────────────────────────────────────────── */}
      <section id="modules" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3 block">Module Suite</span>
            <h2 className={`text-2xl sm:text-4xl font-black ${textBase}`}>
              <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">24+ Modules</span>
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

      {/* ── DESKTOP AGENT ────────────────────────────────────────────────── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
            className={`${glassCls} rounded-3xl p-8 sm:p-12 border ${isDark ? 'border-violet-500/20' : 'border-violet-200'}`}>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <ScanFace size={40} className="text-white" />
                </div>
              </div>
              <div>
                <h3 className={`text-xl sm:text-2xl font-black mb-3 ${textBase}`}>Sangria Desktop Agent</h3>
                <p className={`${textMuted} text-sm leading-relaxed mb-4`}>
                  A lightweight <strong className={textBase}>Windows desktop app</strong> for employee productivity monitoring.
                  Auto-starts on check-in, captures screenshots at configurable intervals, tracks screen lock/unlock,
                  and syncs attendance pauses in real time — all invisible to the employee.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Windows Tray App', 'Auto check-in', 'Screenshot capture', 'Screen lock tracking', 'Configurable interval', 'Auto-start on boot'].map(tag => (
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

      {/* ── TECH STACK ───────────────────────────────────────────────────── */}
      <section id="tech-stack" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-center mb-16">
            <span className="text-xs font-bold text-violet-400 uppercase tracking-widest mb-3 block">Tech Stack</span>
            <h2 className={`text-2xl sm:text-4xl font-black mb-4 ${textBase}`}>
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Built With</span>{' '}Modern Tech
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {techStack.map((tech, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}
                className={`${glassCls} rounded-2xl p-5 group`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tech.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <tech.icon size={18} className="text-white" />
                  </div>
                  <h3 className={`font-bold text-sm ${textBase}`}>{tech.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tech.items.map(item => (
                    <span key={item} className={`text-xs px-2.5 py-1 rounded-lg font-medium border
                      ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className={`relative z-10 border-t py-8 px-6 text-center text-sm
        ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={sangriaLogo} alt="Sangria" className="h-7 w-auto object-contain" />
          <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-700'}`}>Sangria Edutainment</span>
        </div>
        <p>© 2026 Sangria Edutainment Pvt Ltd · HR + CRM Platform</p>
      </footer>
    </div>
  )
}
