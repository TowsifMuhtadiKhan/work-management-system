import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading, isError: profileFailed, isFetching, refetch } = useProfile(user?.id)
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, user, navigate])

  // Persist dark mode preference
  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  if (authLoading) {
    return (
      <div className="flex h-screen w-full">
        <div className="w-60 bg-sidebar shrink-0" />
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b bg-background" />
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile ?? null} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader
          profile={profile ?? null}
          isDark={isDark}
          onToggleDark={toggleDark}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {profileLoading ? (
            <div className="p-6 space-y-4" role="status" aria-label="Loading profile">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : profile && !profile.is_active ? (
            <div role="alert" className="p-6 space-y-3"><h1 className="text-xl font-semibold">Your account is inactive</h1><p>Contact an administrator to restore your access.</p></div>
          ) : profileFailed || !profile ? (
            <div role="alert" className="p-6 space-y-3">
              <h1 className="text-xl font-semibold">{profileFailed ? 'Unable to load your profile' : 'Your profile is not set up yet'}</h1>
              <p className="text-muted-foreground">
                {profileFailed ? 'Please try again. If this continues, contact your administrator.' : 'Contact your administrator to complete your account setup.'}
              </p>
              <Button onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? 'Retrying...' : 'Try again'}
              </Button>
            </div>
          ) : <Outlet />}
        </main>
      </div>
    </div>
  )
}
