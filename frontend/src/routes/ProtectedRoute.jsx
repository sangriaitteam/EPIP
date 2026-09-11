import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 animate-pulse" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading EPIP...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirectMap = {
      admin:    '/admin/dashboard',
      hr:       '/hr/dashboard',
      employee: '/employee/dashboard',
    }
    return <Navigate to={redirectMap[user?.role] || '/login'} replace />
  }

  // Employee OR hr (Admin/Manager) first login → redirect to verification
  if (
    (user?.role === 'employee' || user?.role === 'hr') &&
    user?.isFirstLogin === true &&
    location.pathname !== '/employee/verify-documents'
  ) {
    return <Navigate to="/employee/verify-documents" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
