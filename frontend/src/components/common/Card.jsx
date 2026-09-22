import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

const Card = ({ children, className, hover = false, glass = false, onClick, animate = true, delay = 0, ...props }) => {
  const Wrapper = animate ? motion.div : 'div'
  const animateProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, type: 'spring', stiffness: 110 },
    whileHover: hover ? {
      y: -4,
      scale: 1.01,
      transition: { duration: 0.2 }
    } : undefined,
  } : {}

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'rounded-2xl border transition-all duration-300',
        glass
          ? 'bg-white/5 backdrop-blur-md border-white/10'
          : 'bg-white dark:bg-dark-800 border-gray-100 dark:border-dark-600',
        'shadow-md hover:shadow-xl',
        hover && 'cursor-pointer',
        className
      )}
      {...animateProps}
      {...props}
    >
      {children}
    </Wrapper>
  )
}

export const CardHeader = ({ children, className, ...props }) => (
  <div className={cn('px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-dark-600', className)} {...props}>
    {children}
  </div>
)

export const CardBody = ({ children, className, ...props }) => (
  <div className={cn('px-4 sm:px-6 py-3 sm:py-4', className)} {...props}>
    {children}
  </div>
)

export const CardFooter = ({ children, className, ...props }) => (
  <div className={cn('px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-dark-600', className)} {...props}>
    {children}
  </div>
)

export default Card
