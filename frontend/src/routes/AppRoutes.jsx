import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import DashboardLayout from '../components/layout/DashboardLayout'

// Auth
import Login from '../pages/auth/Login'
import LandingPage from '../pages/LandingPage'
import SuperAdminSetup from '../pages/auth/SuperAdminSetup'

// Employee pages
import EmployeeDashboard from '../pages/employee/Dashboard'
import EmployeeProfile from '../pages/employee/Profile'
import EmployeeAttendance from '../pages/employee/Attendance'
import EmployeeTasks from '../pages/employee/Tasks'
import EmployeeGoals from '../pages/employee/Goals'
import VerifyDocuments from '../pages/employee/VerifyDocuments'

// Project Manager pages
import PMDashboard from '../pages/project-manager/Dashboard'

// HR (Admin) pages
import HRDashboard from '../pages/hr/Dashboard'
import HREmployeeManagement from '../pages/hr/EmployeeManagement'
import HRPerformanceReviews from '../pages/hr/PerformanceReviews'
import HRReports from '../pages/hr/Reports'
import HRScreenshotViewer from '../pages/hr/ScreenshotViewer'
import HRLeaveRequests from '../pages/hr/LeaveRequests'
import HRTodayAttendance from '../pages/hr/TodayAttendance'
import HRAssignTasks from '../pages/hr/AssignTasks'
// Super Admin pages
import AdminDepartments from '../pages/admin/Departments'
import AdminRolesPermissions from '../pages/admin/RolesPermissions'
import AdminSettings from '../pages/admin/Settings'
import AdminHolidayCalendar from '../pages/admin/HolidayCalendar'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminProjects from '../pages/admin/Projects'

import { useAuth } from '../context/AuthContext'

const RootRedirect = () => {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/home" replace />
  const map = {
    superadmin:      '/admin/dashboard',
    admin:           '/admin/dashboard',
    hr:              '/hr/dashboard',
    employee:        '/employee/dashboard',
    project_manager: '/pm/dashboard',
  }
  return <Navigate to={map[user?.role] || '/home'} replace />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/"      element={<RootRedirect />} />
    <Route path="/home"  element={<LandingPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/superadmin/setup" element={<SuperAdminSetup />} />

    {/* Employee OR hr (Admin) — verify documents (outside DashboardLayout) */}
    <Route element={<ProtectedRoute allowedRoles={['employee', 'hr']} />}>
      <Route path="/employee/verify-documents" element={<VerifyDocuments />} />
    </Route>

    {/* Employee */}
    <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/employee/dashboard"       element={<EmployeeDashboard />} />
        <Route path="/employee/profile"         element={<EmployeeProfile />} />
        <Route path="/employee/attendance"      element={<EmployeeAttendance />} />
        <Route path="/employee/tasks"           element={<EmployeeTasks />} />
        <Route path="/employee/goals"           element={<EmployeeGoals />} />
      </Route>
    </Route>

    {/* HR Admin — role: 'hr' only */}
    <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/hr/dashboard"   element={<HRDashboard />} />
        <Route path="/hr/profile"     element={<EmployeeProfile />} />
        <Route path="/hr/employees"   element={<HREmployeeManagement />} />
        <Route path="/hr/performance" element={<HRPerformanceReviews />} />
        <Route path="/hr/reports"     element={<HRReports />} />
        <Route path="/hr/screenshots" element={<HRScreenshotViewer />} />
        <Route path="/hr/leaves"      element={<HRLeaveRequests />} />
        <Route path="/hr/attendance"  element={<HRTodayAttendance />} />
        <Route path="/hr/tasks"       element={<HRAssignTasks />} />
      </Route>
    </Route>

    {/* Super Admin — role: 'superadmin' */}
    <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/admin/dashboard"   element={<AdminDashboard />} />
        <Route path="/admin/projects"    element={<AdminProjects />} />
        <Route path="/admin/departments" element={<AdminDepartments />} />
        <Route path="/admin/roles"       element={<AdminRolesPermissions />} />
        <Route path="/admin/settings"    element={<AdminSettings />} />
        <Route path="/admin/holidays"    element={<AdminHolidayCalendar />} />
      </Route>
    </Route>

    {/* Project Manager */}
    <Route element={<ProtectedRoute allowedRoles={['project_manager']} />}>
      <Route element={<DashboardLayout />}>
        <Route path="/pm/dashboard" element={<PMDashboard />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default AppRoutes
