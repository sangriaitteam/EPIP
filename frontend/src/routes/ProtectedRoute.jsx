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
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // PM routes → PM login page ge redirect
    if (location.pathname.startsWith('/pm/')) {
      return <Navigate to="/pm/login" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const redirectMap = {
      admin:           '/admin/dashboard',
      hr:              '/hr/dashboard',
      employee:        '/employee/dashboard',
      project_manager: '/pm/dashboard',
    }
    return <Navigate to={redirectMap[user?.role] || '/login'} replace />
  }

  // Employee first login → redirect to verification (HR excluded)
  if (
    user?.role === 'employee' &&
    user?.isFirstLogin === true &&
    location.pathname !== '/employee/verify-documents'
  ) {
    return <Navigate to="/employee/verify-documents" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
