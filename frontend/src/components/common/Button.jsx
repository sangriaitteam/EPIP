import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

const variants = {
  primary:   'bg-gradient-to-r from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-lg shadow-primary-500/30',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
  danger:    'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg shadow-red-500/25',
  success:   'bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg shadow-green-500/25',
  ghost:     'bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300',
  outline:   'border border-primary-500 text-primary-500 hover:bg-primary-500/10 bg-transparent',
}
const sizes = {
  sm:   'px-3 py-1.5 text-xs',
  md:   'px-4 py-2 text-sm',
  lg:   'px-6 py-3 text-base',
  icon: 'p-2',
}

const Button = ({ children, variant = 'primary', size = 'md', className, disabled, loading, onClick, type = 'button', ...props }) => {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96, y: 0, rotateX: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{ transformStyle: 'preserve-3d' }}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-200 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {/* 3D front face highlight */}
      <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      {loading ? (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-4 w-4"
          viewBox="0 0 24 24" fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </motion.svg>
      ) : null}
      {children}
    </motion.button>
  )
}

export default Button
