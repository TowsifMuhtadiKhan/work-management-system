import { ErrorPage, RouteErrorPage } from './ErrorPage'
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
import { RushPage } from '@/features/rush/RushPage'
import { ContentCreatorPage } from '@/features/content-creator/ContentCreatorPage'

// Lazy admin pages that are less frequently accessed
const router = createBrowserRouter([
  // Auth routes — no sidebar/header
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage standalone />,
    children: [
      { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
      { path: '/signup', element: <SignupPage />, errorElement: <RouteErrorPage /> },
    ],
  },

  // Authenticated app routes — with sidebar + header
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage standalone />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage />, errorElement: <RouteErrorPage /> },
      { path: '/tasks', element: <DailyTasksPage />, errorElement: <RouteErrorPage /> },
      { path: '/tasks/digital', element: <DailyTasksPage key="digital" section="digital" />, errorElement: <RouteErrorPage /> },
      { path: '/tasks/web', element: <DailyTasksPage key="web" section="web" />, errorElement: <RouteErrorPage /> },
      { path: '/my-tasks', element: <MyTasksPage />, errorElement: <RouteErrorPage /> },
      { path: '/rush', element: <RushPage />, errorElement: <RouteErrorPage /> },
      { path: '/content-creator', element: <ContentCreatorPage />, errorElement: <RouteErrorPage /> },
      { path: '/reports', element: <ReportsPage />, errorElement: <RouteErrorPage /> },
      { path: '/marketing', element: <MarketingPage />, errorElement: <RouteErrorPage /> },
      { path: '/marketing/digital', element: <MarketingPage key="digital" section="digital" />, errorElement: <RouteErrorPage /> },
      { path: '/marketing/web', element: <MarketingPage key="web" section="web" />, errorElement: <RouteErrorPage /> },
      { path: '/profile', element: <ProfilePage />, errorElement: <RouteErrorPage /> },

      // Admin routes — wrapped in AdminLayout guard
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin', element: <Navigate to="/admin/employees" replace />, errorElement: <RouteErrorPage /> },
          { path: '/admin/employees', element: <EmployeesPage />, errorElement: <RouteErrorPage /> },
          { path: '/admin/departments', element: <CatalogPage key="departments" catalog="departments" />, errorElement: <RouteErrorPage /> },
          { path: '/admin/task-types', element: <CatalogPage key="task_types" catalog="task_types" />, errorElement: <RouteErrorPage /> },
          { path: '/admin/channels', element: <CatalogPage key="channels" catalog="channels" />, errorElement: <RouteErrorPage /> },
          { path: '/admin/marketing-ads', element: <CatalogPage key="marketing_ads" catalog="marketing_ads" />, errorElement: <RouteErrorPage /> },
          { path: '/admin/settings', element: <SettingsPage />, errorElement: <RouteErrorPage /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <ErrorPage kind="not-found" standalone />, errorElement: <RouteErrorPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

// ─── Placeholder pages for future phases ─────────────────────────────────────

