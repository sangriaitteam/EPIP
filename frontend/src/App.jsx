import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppRoutes from './routes/AppRoutes'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: 'var(--toast-bg)', color: 'var(--toast-color)', borderRadius: '12px' },
            className: 'dark:bg-dark-700 dark:text-white bg-white text-gray-900 border border-gray-100 dark:border-dark-600 shadow-xl',
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
)

export default App
