import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DailyTasksPage } from '@/features/tasks/DailyTasksPage'
import { MyTasksPage } from '@/features/my-tasks/MyTasksPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { EmployeesPage } from '@/features/admin/employees/EmployeesPage'
import { CatalogPage } from '@/features/admin/CatalogPage'
import { SettingsPage } from '@/features/admin/SettingsPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { MarketingPage } from '@/features/marketing/MarketingPage'

// Lazy admin pages that are less frequently accessed
const router = createBrowserRouter([
  // Auth routes — no sidebar/header
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },

  // Authenticated app routes — with sidebar + header
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/tasks', element: <DailyTasksPage /> },
      { path: '/my-tasks', element: <MyTasksPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/marketing', element: <MarketingPage /> },
      { path: '/profile', element: <ProfilePage /> },

      // Admin routes — wrapped in AdminLayout guard
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/employees" replace /> },
          { path: '/admin/employees', element: <EmployeesPage /> },
          { path: '/admin/departments', element: <CatalogPage key="departments" catalog="departments" /> },
          { path: '/admin/task-types', element: <CatalogPage key="task_types" catalog="task_types" /> },
          { path: '/admin/channels', element: <CatalogPage key="channels" catalog="channels" /> },
          { path: '/admin/marketing-ads', element: <CatalogPage key="marketing_ads" catalog="marketing_ads" /> },
          { path: '/admin/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

// ─── Placeholder pages for future phases ─────────────────────────────────────

