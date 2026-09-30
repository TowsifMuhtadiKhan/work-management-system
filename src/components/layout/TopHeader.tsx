import { useState } from 'react'
import { Bell, LogOut, User, KeyRound, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, CheckSquare, Clapperboard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/components/common/UserAvatar'
import { signOut } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { Profile } from '@/types/entities'
import { APP_ROLE_LABELS } from '@/types/enums'
import { fetchTasks } from '@/services/tasks.service'
import { fetchContentPackages } from '@/services/contentPackages.service'
import { slotLabel } from '@/features/tasks/timeSlots'
import { cn } from '@/utils/cn'

interface TopHeaderProps {
  profile: Profile | null
  pageTitle?: string
  onOpenMenu: () => void
  menuOpen: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

interface NotificationItem {
  id: string
  type: 'task' | 'review'
  title: string
  subtitle: string
  link: string
  createdAt: string
  isRead: boolean
}

export function TopHeader({ profile, pageTitle, onOpenMenu, menuOpen, sidebarCollapsed, onToggleSidebar }: TopHeaderProps) {
  const navigate = useNavigate()
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all')

  const storageKey = profile?.id ? `notifications_read_${profile.id}` : null
  const [readIds, setReadIds] = useState<string[]>(() => {
    if (!storageKey) return []
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]')
    } catch {
      return []
    }
  })

  const tasksQuery = useQuery({
    queryKey: ['my-notifications-tasks', profile?.id],
    queryFn: () => fetchTasks({ assignedTo: profile?.id }),
    enabled: !!profile?.id,
    refetchInterval: 15000,
  })

  const contentQuery = useQuery({
    queryKey: ['my-notifications-reviews', profile?.id],
    queryFn: fetchContentPackages,
    enabled: !!profile?.id,
    refetchInterval: 30000,
  })

  const taskNotifications: NotificationItem[] = (tasksQuery.data ?? []).slice(0, 30).map(task => ({
    id: `task-${task.id}`,
    type: 'task',
    title: task.file_name,
    subtitle: `Task assigned · ${task.work_date}${task.time_slot ? ' · ' + slotLabel(task.time_slot) : ''}`,
    link: `/tasks/${task.work_section ?? 'digital'}?date=${task.work_date}`,
    createdAt: task.created_at,
    isRead: readIds.includes(`task-${task.id}`),
  }))

  const reviewNotifications: NotificationItem[] = (contentQuery.data ?? [])
    .filter(pkg => pkg.creator_id === profile?.id && pkg.status === 'export_done')
    .map(pkg => ({
      id: `pkg-${pkg.id}`,
      type: 'review',
      title: pkg.package_name,
      subtitle: 'Exported to Daily Tasks',
      link: `/content-creator?package=${pkg.id}`,
      createdAt: pkg.created_at,
      isRead: readIds.includes(`pkg-${pkg.id}`),
    }))

  const allNotifications = [...reviewNotifications, ...taskNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const unreadCount = allNotifications.filter(n => !n.isRead).length
  const displayedNotifications = filterTab === 'unread' ? allNotifications.filter(n => !n.isRead) : allNotifications

  const markAsRead = (id: string) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
      }
      return next
    })
  }

  const markAllAsRead = () => {
    const allIds = allNotifications.map(n => n.id)
    setReadIds(allIds)
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify(allIds)) } catch {}
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-2 px-3 sm:px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      {/* Page title */}
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open navigation" aria-expanded={menuOpen} onClick={onOpenMenu}><Menu className="h-5 w-5" /></Button>
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex shrink-0" aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'} title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'} aria-expanded={!sidebarCollapsed} aria-controls="desktop-navigation" onClick={onToggleSidebar}>
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
        {pageTitle && (
          <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-foreground/80 hover:text-foreground"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 rounded-xl shadow-xl border bg-popover text-popover-foreground z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 text-[10px] font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault()
                    markAllAsRead()
                  }}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Filter tabs: All vs Unread */}
            <div className="flex border-b px-2 py-1 text-xs gap-1 bg-muted/10">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                  filterTab === 'all' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({allNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
                  filterTab === 'unread' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
              {displayedNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {filterTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </div>
              ) : (
                displayedNotifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      markAsRead(item.id)
                      navigate(item.link)
                    }}
                    className={cn(
                      "flex items-start gap-3 p-3 text-xs transition-colors cursor-pointer hover:bg-muted/50",
                      !item.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    {/* Type Icon */}
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0 mt-0.5",
                      item.type === 'task' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                    )}>
                      {item.type === 'task' ? <CheckSquare className="h-3.5 w-3.5" /> : <Clapperboard className="h-3.5 w-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={cn("truncate text-xs", !item.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile dropdown */}
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Account menu" className="flex items-center gap-2 h-9 px-2">
                <UserAvatar
                  name={profile.full_name}
                  avatarUrl={profile.avatar_url}
                  size="sm"
                />
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-medium leading-none">{profile.full_name}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {APP_ROLE_LABELS[profile.application_role]}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                  {profile.employee_code && (
                    <p className="text-xs text-muted-foreground">{profile.employee_code}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
