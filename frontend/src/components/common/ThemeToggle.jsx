import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200
        ${isDark
          ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700 border border-slate-700'
          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 shadow-sm'
        } ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </motion.button>
  )
}

export default ThemeToggle
