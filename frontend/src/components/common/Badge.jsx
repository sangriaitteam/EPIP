import React from 'react'
import { motion } from 'framer-motion'
import { cn, capitalize } from '../../utils/helpers'

const Badge = ({ label, color, className, dot = false }) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        color || 'bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-gray-300',
        className
      )}
    >
      {dot && (
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-current"
        />
      )}
      {label ? capitalize(label) : ''}
    </motion.span>
  )
}

export default Badge
