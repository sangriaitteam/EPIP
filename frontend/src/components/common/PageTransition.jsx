import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    rotateX: -5,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.5,
      ease: [0.6, 0.01, 0.05, 0.95],
      staggerChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.3
    }
  }
}

const childVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4
    }
  }
}

export const PageTransition = ({ children, className = '' }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    className={className}
    style={{ transformStyle: 'preserve-3d' }}
  >
    {children}
  </motion.div>
)

export const StaggerContainer = ({ children, className = '' }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    className={className}
  >
    {children}
  </motion.div>
)

export const StaggerItem = ({ children, className = '' }) => (
  <motion.div variants={childVariants} className={className}>
    {children}
  </motion.div>
)

export default PageTransition
