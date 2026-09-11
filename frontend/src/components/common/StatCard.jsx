import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary', className, delay = 0 }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-500/10', icon: 'text-primary-500', glow: 'shadow-primary-500/20', bar: 'from-primary-400 to-primary-600' },
    green:   { bg: 'bg-green-500/10',   icon: 'text-green-500',   glow: 'shadow-green-500/20',   bar: 'from-green-400 to-green-600' },
    yellow:  { bg: 'bg-yellow-500/10',  icon: 'text-yellow-500',  glow: 'shadow-yellow-500/20',  bar: 'from-yellow-400 to-yellow-600' },
    red:     { bg: 'bg-red-500/10',     icon: 'text-red-500',     glow: 'shadow-red-500/20',     bar: 'from-red-400 to-red-600' },
    purple:  { bg: 'bg-purple-500/10',  icon: 'text-purple-500',  glow: 'shadow-purple-500/20',  bar: 'from-purple-400 to-purple-600' },
    blue:    { bg: 'bg-blue-500/10',    icon: 'text-blue-500',    glow: 'shadow-blue-500/20',    bar: 'from-blue-400 to-blue-600' },
    teal:    { bg: 'bg-teal-500/10',    icon: 'text-teal-500',    glow: 'shadow-teal-500/20',    bar: 'from-teal-400 to-teal-600' },
  }
  const c = colorMap[color] || colorMap.primary

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -15, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 120, damping: 14 }}
      whileHover={{
        y: -8,
        rotateX: 6,
        rotateY: 4,
        scale: 1.03,
        transition: { duration: 0.25 }
      }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className={cn(
        'rounded-2xl p-5 border bg-white dark:bg-dark-800 cursor-default',
        'border-gray-100 dark:border-dark-600',
        'shadow-lg hover:shadow-2xl',
        `hover:${c.glow}`,
        className
      )}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full rounded-full bg-gradient-to-r ${c.bar} mb-4 opacity-70`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>

          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, duration: 0.4, type: 'spring' }}
            className="text-3xl font-bold text-gray-900 dark:text-white mt-1"
          >
            {value}
          </motion.p>

          {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}

          {trend && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.4 }}
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium mt-2 px-2 py-0.5 rounded-full',
                trend === 'up' ? 'text-green-600 bg-green-500/10' : 'text-red-600 bg-red-500/10'
              )}
            >
              <span>{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </motion.div>
          )}
        </div>

        {Icon && (
          <motion.div
            whileHover={{ rotate: 360, scale: 1.2 }}
            transition={{ duration: 0.6 }}
            className={cn('p-3 rounded-xl', c.bg)}
          >
            <Icon size={22} className={c.icon} />
          </motion.div>
        )}
      </div>

      {/* 3D depth shadow layer */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"
        style={{ transform: 'translateZ(-4px)' }}
      />
    </motion.div>
  )
}

export default StatCard
