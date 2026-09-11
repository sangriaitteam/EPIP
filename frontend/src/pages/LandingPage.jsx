import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, Brain, Shield, Zap, TrendingUp,
  Target, Award, BookOpen, Globe, ChevronRight,
  CheckCircle, ArrowRight, Play
} from 'lucide-react'
import ThemeToggle from '../components/common/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

const features = [
  { icon: Brain,     title: 'AI-Powered Insights',    desc: 'Advanced ML algorithms analyze performance patterns and generate actionable recommendations.', color: 'from-blue-500 to-cyan-500' },
  { icon: BarChart3, title: 'Real-Time Analytics',     desc: 'Live dashboards with performance heatmaps, trend lines, and predictive analytics.',             color: 'from-violet-500 to-purple-500' },
  { icon: Target,    title: 'Goal Management (OKR)',   desc: 'Align individual, team, and company goals with smart KPI tracking.',                             color: 'from-emerald-500 to-teal-500' },
  { icon: Users,     title: '360° Feedback',           desc: 'Comprehensive feedback from peers, managers, clients, and self-assessment.',                      color: 'from-orange-500 to-amber-500' },
  { icon: Shield,    title: 'Enterprise Security',     desc: 'JWT, OAuth, SSO, 2FA, GDPR compliant, ISO 27001 certified architecture.',                         color: 'from-red-500 to-rose-500' },
  { icon: BookOpen,  title: 'Learning Management',     desc: 'AI-recommended courses, certifications, and personalized learning paths.',                        color: 'from-pink-500 to-fuchsia-500' },
  { icon: Award,     title: 'Rewards & Recognition',   desc: 'Gamified achievements, leaderboards, and digital certificates.',                                  color: 'from-yellow-500 to-orange-500' },
  { icon: TrendingUp,title: 'Career Roadmap',          desc: 'AI-generated career growth plans, promotion readiness scoring.',                                  color: 'from-indigo-500 to-blue-500' },
]

const stats = [
  { value: '50K+', label: 'Employees Managed' },
  { value: '500+', label: 'Companies Trust Us' },
  { value: '99.9%',label: 'Uptime SLA' },
  { value: '40%',  label: 'Productivity Boost' },
]

const roles = [
  'Super Administrator', 'HR Administrator', 'Department Head',
  'Reporting Manager', 'Team Lead', 'Employee', 'Auditor',
]

const modules = [
  'Employee Management',  'Attendance Tracking',     'Desktop Agent',
  'Screenshot Capture',   'Task Management',          'Project Management',
  'Goal Management (OKR)','Performance Reviews',      'Self Assessment',
  '360° Feedback',        'AI Performance Engine',    'Learning Management',
  'Employee Dashboard',   'Manager Dashboard',        'HR Dashboard',
  'Rewards & Badges',     'Warnings & Escalation',    'Advanced Reports',
  'Admin Settings',       'Notifications',            'Document Management',
  'AI Chat Assistant',
]

const PROGRESS_ITEMS = [
  { label: 'Performance Score', value: 87, color: 'from-blue-500 to-violet-500' },
  { label: 'Goal Completion',   value: 72, color: 'from-emerald-500 to-teal-500' },
  { label: 'Attendance Rate',   value: 95, color: 'from-orange-500 to-amber-500' },
]

export default function LandingPage() {
  const navigate    = useNavigate()
  const canvasRef   = useRef(null)
  const { theme }   = useTheme()
  const isDark      = theme === 'dark'

  // ── Particle canvas ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const particles = Array.from({ length: 80 }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      vx:    (Math.random() - 0.5) * 0.5,
      vy:    (Math.random() - 0.5) * 0.5,
      r:     Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.1,
    }))

    let animId
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.alpha})`
        ctx.fill()
      })

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const dx   = a.x - b.x
          const dy   = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(99,102,241,${0.15 * (1 - dist / 120)})`
            ctx.lineWidth   = 0.5
            ctx.stroke()
          }
        })
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── Theme-aware classes ────────────────────────────────────────────────────
  const bg        = isDark ? 'bg-slate-950'  : 'bg-slate-50'
  const textBase  = isDark ? 'text-white'    : 'text-slate-900'
  const textMuted = isDark ? 'text-slate-400': 'text-slate-500'
  const glassCls  = isDark
    ? 'bg-white/5 backdrop-blur-md border border-white/10'
    : 'bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm'
  const navBorder = isDark ? 'border-white/5'  : 'border-slate-200'
  const roleCard  = isDark
    ? 'border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'
    : 'border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-500 bg-white/60'
  const moduleCard = isDark
    ? 'bg-white/5 border border-transparent hover:border-blue-500/50'
    : 'bg-white border border-slate-200 hover:border-blue-400'
  const statCard  = isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-sm'
  const heroBg    = isDark ? 'bg-slate-900'   : 'bg-slate-100'
  const gridBg    = isDark ? 'bg-slate-900'   : 'bg-white'
  const progressBg= isDark ? 'bg-white/5 border border-white/10': 'bg-slate-50 border border-slate-200'

  return (
    <div className={`min-h-screen ${bg} ${textBase} overflow-x-hidden transition-colors duration-300`}>

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: isDark ? 1 : 0.3 }}
      />

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <nav className={`relative z-10 flex items-center justify-between px-6 md:px-10 py-4 ${glassCls} border-b ${navBorder} sticky top-0`}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <span className="font-black text-lg bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              EPIP
            </span>
            <p className={`text-[10px] leading-none ${textMuted}`}>Performance Intelligence</p>
          </div>
        </div>

        {/* Links */}
        <div className={`hidden md:flex items-center gap-8 text-sm ${textMuted}`}>
          {['Features', 'Modules', 'Roles'].map(item => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className={`hover:text-blue-500 transition-colors`}
            >
              {item}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => navigate('/login')}
            className={`text-sm px-4 py-2 rounded-xl font-medium transition-all border
              ${isDark
                ? 'border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400'
                : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-500 bg-white'
              }`}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm px-4 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-[calc(100vh-72px)] flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
              <Zap size={14} /> Enterprise HR Intelligence Platform
            </span>

            {/* Headline */}
            <h1 className={`text-5xl md:text-7xl font-black leading-tight mb-6 ${textBase}`}>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Transform
              </span>{' '}
              How Your
              <br />
              Organization{' '}
              <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                Performs
              </span>
            </h1>

            <p className={`text-xl ${textMuted} max-w-3xl mx-auto mb-10 leading-relaxed`}>
              EPIP is the next-generation AI-powered employee performance platform that helps
              teams achieve peak productivity, managers make data-driven decisions, and HR run
              fair appraisals at scale.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={() => navigate('/login')}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 justify-center text-base py-4 px-8 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
              >
                Start Free Trial <ArrowRight size={18} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 justify-center text-base py-4 px-8 rounded-2xl font-semibold transition-all border
                  ${isDark
                    ? 'border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400 bg-white/5'
                    : 'border-slate-200 text-slate-600 hover:border-blue-400 bg-white shadow-sm'
                  }`}
              >
                <Play size={18} className="text-blue-400" /> Watch Demo
              </motion.button>
            </div>
          </motion.div>

          {/* Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="mt-20"
          >
            <div className={`rounded-3xl p-1 mx-auto max-w-5xl border shadow-2xl ${isDark ? 'border-blue-500/20 shadow-blue-500/10' : 'border-blue-200 shadow-blue-100'}`}
              style={{ background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)' }}
            >
              <div className={`${gridBg} rounded-3xl p-6`}>
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {stats.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className={`${statCard} rounded-2xl p-4 text-center`}
                    >
                      <div className="text-3xl font-black bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
                        {s.value}
                      </div>
                      <div className={`text-xs ${textMuted} mt-1`}>{s.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="grid grid-cols-3 gap-3">
                  {PROGRESS_ITEMS.map((item, i) => (
                    <div key={i} className={`${progressBg} rounded-xl p-4`}>
                      <div className={`text-xs ${textMuted} mb-2`}>{item.label}</div>
                      <div className={`h-2 rounded-full w-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.5, delay: 1 + i * 0.2, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                        />
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

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-center mb-16"
          >
            <h2 className={`text-4xl font-black mb-4 ${textBase}`}>
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                22 Powerful
              </span>{' '}
              Modules
            </h2>
            <p className={textMuted}>Everything your organization needs in one intelligent platform</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className={`${glassCls} rounded-2xl p-6 group cursor-default`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <f.icon size={24} className="text-white" />
                </div>
                <h3 className={`font-bold mb-2 ${textBase}`}>{f.title}</h3>
                <p className={`text-sm ${textMuted} leading-relaxed`}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ────────────────────────────────────────────────────────────── */}
      <section id="roles" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-4xl font-black mb-4 ${textBase}`}>
            Built for{' '}
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              Every Role
            </span>
          </h2>
          <p className={`${textMuted} mb-12`}>
            Role-based access ensures every team member sees what matters most
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {roles.map((role, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08, type: 'spring' }}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`${glassCls} px-5 py-3 rounded-xl text-sm font-medium border transition-all duration-300 cursor-default ${roleCard}`}
              >
                {role}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES GRID ─────────────────────────────────────────────────────── */}
      <section id="modules" className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className={`text-4xl font-black text-center mb-16 ${textBase}`}>
            Complete{' '}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              Module Suite
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {modules.map((mod, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ scale: 1.03, y: -2 }}
                className={`${moduleCard} rounded-xl p-4 flex items-center gap-3 transition-all duration-300 group`}
              >
                <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className={`text-sm ${textMuted} group-hover:text-blue-500 transition-colors`}>{mod}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`max-w-4xl mx-auto ${glassCls} rounded-3xl p-12 text-center border shadow-2xl
            ${isDark ? 'border-blue-500/20 shadow-blue-500/10' : 'border-blue-200 shadow-blue-100'}`}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-6"
          >
            <Globe size={48} className="text-blue-400" />
          </motion.div>
          <h2 className={`text-4xl font-black mb-4 ${textBase}`}>
            Ready to Transform Your Workforce?
          </h2>
          <p className={`${textMuted} text-lg mb-8`}>
            Join 500+ organizations already using EPIP to build high-performing teams
          </p>
          <motion.button
            onClick={() => navigate('/login')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 text-lg py-4 px-10 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow"
          >
            Get Started Today <ChevronRight size={20} />
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className={`relative z-10 border-t py-8 px-6 text-center text-sm
        ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain size={16} className="text-blue-500" />
          <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Sangria Edutainment Pvt Ltd
          </span>
        </div>
        <p>© 2026 Employee Performance Intelligence Platform. Enterprise-grade. AI-powered.</p>
      </footer>
    </div>
  )
}
