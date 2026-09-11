import React from 'react'
import { cn } from '../../utils/helpers'

const Input = React.forwardRef(({ label, error, icon: Icon, className, type = 'text', ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-dark-700 text-gray-900 dark:text-white',
            'placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200',
            'border-gray-200 dark:border-dark-600',
            Icon ? 'pl-9 pr-4 py-2.5 text-sm' : 'px-4 py-2.5 text-sm',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'

export const Select = React.forwardRef(({ label, error, className, children, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
    <select
      ref={ref}
      className={cn(
        'w-full rounded-xl border bg-white dark:bg-dark-700 text-gray-900 dark:text-white',
        'px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
        'border-gray-200 dark:border-dark-600 transition-all duration-200',
        error && 'border-red-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
))
Select.displayName = 'Select'

export const Textarea = React.forwardRef(({ label, error, className, rows = 4, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full rounded-xl border bg-white dark:bg-dark-700 text-gray-900 dark:text-white',
        'px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
        'border-gray-200 dark:border-dark-600 transition-all duration-200 resize-none',
        error && 'border-red-500',
        className
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

export default Input
