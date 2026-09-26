import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

/**
 * Guard that restricts access to admin-only routes.
 * Redirects non-administrators back to the dashboard.
 */
export function AdminLayout() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)

  if (profile && profile.application_role !== 'administrator') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
