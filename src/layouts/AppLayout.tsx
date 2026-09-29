import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopHeader } from '@/components/layout/TopHeader'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

export function AppLayout() {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading, isError: profileFailed, isFetching, refetch } = useProfile(user?.id)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })
  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { /* Keep the toggle usable when storage is unavailable. */ }
  }
  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true })
    }
  }, [authLoading, user, navigate])

  // Ensure dark mode class and storage are cleared
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    try { localStorage.removeItem('theme') } catch {}
  }, [])

  if (authLoading) {
    return (
      <div className="flex h-dvh w-full">
        <div className="hidden lg:block w-60 bg-sidebar shrink-0" />
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
    <div className="app-shell relative flex h-dvh overflow-hidden">
      <div id="desktop-navigation" className="hidden lg:block shrink-0 h-full"><Sidebar profile={profile ?? null} collapsed={sidebarCollapsed} /></div>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="mobile-navigation left-0 top-0 block h-dvh max-h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-sidebar p-0 sm:p-0 text-sidebar-foreground sm:rounded-none" onClick={event => { if ((event.target as HTMLElement).closest('a')) setMenuOpen(false) }}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">Choose a page from the main or administration menu.</DialogDescription>
          <Sidebar profile={profile ?? null} className="w-full" />
        </DialogContent>
      </Dialog>
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader
          profile={profile ?? null}
          onOpenMenu={() => setMenuOpen(true)}
          menuOpen={menuOpen}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />
        <main className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
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
