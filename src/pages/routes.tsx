import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DailyTasksPage } from '@/features/tasks/DailyTasksPage'
import { MyTasksPage } from '@/features/my-tasks/MyTasksPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { EmployeesPage } from '@/features/admin/employees/EmployeesPage'

// Lazy admin pages that are less frequently accessed
const router = createBrowserRouter([
  // Auth routes — no sidebar/header
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
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
      { path: '/marketing', element: <MarketingPlaceholder /> },
      { path: '/profile', element: <ProfilePlaceholder /> },

      // Admin routes — wrapped in AdminLayout guard
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/employees" replace /> },
          { path: '/admin/employees', element: <EmployeesPage /> },
          { path: '/admin/departments', element: <AdminPlaceholder title="Departments" /> },
          { path: '/admin/task-types', element: <AdminPlaceholder title="Task Types" /> },
          { path: '/admin/channels', element: <AdminPlaceholder title="Channels" /> },
          { path: '/admin/marketing-ads', element: <AdminPlaceholder title="Marketing Ads" /> },
          { path: '/admin/settings', element: <AdminPlaceholder title="Settings" /> },
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

function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">
        This administration page will be available in a future update.
      </p>
    </div>
  )
}

function MarketingPlaceholder() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Marketing Tracking</h1>
      <p className="text-muted-foreground mt-2">
        Detailed marketing campaign tracking will be available soon.
        See the Dashboard for current daily targets.
      </p>
    </div>
  )
}

function ProfilePlaceholder() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">My Profile</h1>
      <p className="text-muted-foreground mt-2">
        Profile settings page coming soon.
      </p>
    </div>
  )
}
