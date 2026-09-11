import React from 'react'
import { motion } from 'framer-motion'
import { cn, getInitials } from '../../utils/helpers'

const sizeMap = {
  xs:   'w-6 h-6 text-xs',
  sm:   'w-8 h-8 text-xs',
  md:   'w-10 h-10 text-sm',
  lg:   'w-12 h-12 text-base',
  xl:   'w-16 h-16 text-lg',
  '2xl':'w-20 h-20 text-xl',
}

const ringSize = {
  xs:   'w-2 h-2',
  sm:   'w-2.5 h-2.5',
  md:   'w-3 h-3',
  lg:   'w-3.5 h-3.5',
  xl:   'w-4 h-4',
  '2xl':'w-5 h-5',
}

const colorMap = [
  'from-primary-500 to-purple-600',
  'from-purple-500 to-pink-500',
  'from-pink-500 to-rose-500',
  'from-green-500 to-teal-500',
  'from-yellow-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-red-500 to-orange-500',
  'from-teal-500 to-green-500',
]

const Avatar = ({ name, src, size = 'md', className, online, animate = true }) => {
  const colorIndex = name ? name.charCodeAt(0) % colorMap.length : 0
  const gradient = colorMap[colorIndex]

  return (
    <motion.div
      className={cn('relative inline-flex flex-shrink-0', className)}
      whileHover={{ scale: 1.1, rotateY: 15 }}
      whileTap={{ scale: 0.95 }}
      initial={animate ? { scale: 0, opacity: 0 } : undefined}
      animate={animate ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Glow ring */}
      <div className={cn(
        'absolute inset-0 rounded-full blur-sm opacity-40',
        `bg-gradient-to-br ${gradient}`
      )} />

      <div className={cn(
        'relative rounded-full flex items-center justify-center font-semibold text-white overflow-hidden',
        sizeMap[size],
        !src && `bg-gradient-to-br ${gradient}`,
        'shadow-lg ring-2 ring-white/20 dark:ring-dark-600/50'
      )}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            {getInitials(name)}
          </span>
        )}
      </div>

      {/* Online indicator with pulse */}
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-dark-800 z-10',
          online ? 'bg-green-400' : 'bg-gray-400',
          ringSize[size]
        )}>
          {online && (
            <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
          )}
        </span>
      )}
    </motion.div>
  )
}

export default Avatar
