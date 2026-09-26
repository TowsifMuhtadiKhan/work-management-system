import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

/**
 * Guard that restricts access to admin-only routes.
 * Redirects non-administrators back to the dashboard.
 */
export function AdminLayout() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading, isError } = useProfile(user?.id)

  if (authLoading || isLoading) return <p role="status" className="p-6">Checking administrator access...</p>
  if (isError || !profile || !profile.is_active || profile.application_role !== 'administrator') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
