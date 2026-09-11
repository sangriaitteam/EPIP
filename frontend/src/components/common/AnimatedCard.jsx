import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

// 3D animated card with hover effects
const AnimatedCard = ({ children, className, delay = 0, hover3d = true, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={hover3d ? { 
        y: -8, 
        rotateX: 5,
        rotateY: 5,
        scale: 1.02,
        transition: { duration: 0.3 }
      } : undefined}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className={cn(
        'rounded-2xl border transition-all duration-300',
        'bg-white dark:bg-dark-800 border-gray-100 dark:border-dark-600',
        'shadow-lg hover:shadow-2xl',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedCard
