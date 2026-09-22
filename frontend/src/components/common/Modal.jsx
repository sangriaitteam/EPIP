import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../utils/helpers'

const sizeMap = {
  sm:   'sm:max-w-md',
  md:   'sm:max-w-lg',
  lg:   'sm:max-w-2xl',
  xl:   'sm:max-w-4xl',
  full: 'sm:max-w-6xl',
}

/**
 * Modal component
 *
 * Props:
 *  - isOpen, onClose, title, children, size ('sm'|'md'|'lg'|'xl'|'full'), className
 *  - mobileSheet (bool, default true) — on mobile slides up as bottom-sheet;
 *    set to false to always use centered dialog.
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md', className, mobileSheet = true }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            'fixed inset-0 z-50 flex p-0',
            mobileSheet
              ? 'items-end sm:items-center sm:p-4'
              : 'items-center p-4'
          )}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={mobileSheet
              ? { opacity: 0, y: '100%' }
              : { opacity: 0, scale: 0.92, y: 20 }
            }
            animate={mobileSheet
              ? { opacity: 1, y: 0 }
              : { opacity: 1, scale: 1, y: 0 }
            }
            exit={mobileSheet
              ? { opacity: 0, y: '100%' }
              : { opacity: 0, scale: 0.92, y: 20 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'relative w-full bg-white dark:bg-dark-800 shadow-2xl',
              'border border-gray-100 dark:border-dark-600 flex flex-col',
              // Mobile bottom-sheet: rounded top corners only, max 90vh
              mobileSheet
                ? 'rounded-t-2xl sm:rounded-2xl max-h-[90vh]'
                : 'rounded-2xl max-h-[90vh]',
              // Width constraint — full on mobile, capped on sm+
              'sm:mx-auto',
              sizeMap[size],
              className
            )}
          >
            {/* Drag handle — visible on mobile sheet only */}
            {mobileSheet && (
              <div className="sm:hidden flex justify-center pt-2.5 pb-0 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-dark-500" />
              </div>
            )}

            {/* Top glow strip — desktop only */}
            <div className="hidden sm:block absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent rounded-full" />

            {title && (
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-dark-600 flex-shrink-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
                <motion.button
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={18} />
                </motion.button>
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default Modal
