import React from 'react'
import { motion } from 'framer-motion'
import { cn, getProgressColor } from '../../utils/helpers'

const ProgressBar = ({ value = 0, max = 100, label, showPercent = true, size = 'md', className, color }) => {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100)
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
  const barColor = color || getProgressColor(percent)

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
          {showPercent && (
            <motion.span
              key={percent}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs font-semibold text-gray-700 dark:text-gray-200"
            >
              {Math.round(percent)}%
            </motion.span>
          )}
        </div>
      )}

      <div className={cn('w-full bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden relative', heights[size])}>
        {/* Glow bg — contained within the bar */}

        <motion.div
          className={cn('h-full rounded-full relative overflow-hidden', barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        >
          {/* Shimmer sweep */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default ProgressBar
