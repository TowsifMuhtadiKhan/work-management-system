import { useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Settings,
  Users,
  Building2,
  Tags,
  Radio,
  Megaphone,
  ChevronRight,
  Zap,
  Clapperboard,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { BrandLogo } from '@/components/common/BrandLogo'
import type { Profile } from '@/types/entities'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  managerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Rush', href: '/rush', icon: Zap },
  { label: 'Content Creator', href: '/content-creator', icon: Clapperboard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Marketing', href: '/marketing', icon: TrendingUp },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Employees', href: '/admin/employees', icon: Users },
  { label: 'Departments', href: '/admin/departments', icon: Building2 },
  { label: 'Task Types', href: '/admin/task-types', icon: Tags },
  { label: 'Channels', href: '/admin/channels', icon: Radio },
  { label: 'Marketing Ads', href: '/admin/marketing-ads', icon: Megaphone },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

interface SidebarProps {
  profile: Profile | null
  className?: string
}

export function Sidebar({ profile, className }: SidebarProps) {
  const isAdmin = profile?.application_role === 'administrator'
  const canViewReports = profile
    ? ['administrator', 'manager', 'team_lead'].includes(profile.application_role)
    : false

  return (
    <aside className={cn('flex flex-col w-60 h-full min-h-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border', className)}>
      {/* Logo / Brand */}
      <div className="flex flex-col items-center justify-center px-6 py-5 border-b border-sidebar-border">
        <BrandLogo className="w-full" />
        <p className="mt-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Digital Content Management</p>
      </div>

      <ScrollArea className="min-h-0 flex-1 py-4">
        {/* Main Navigation */}
        <nav className="px-3 space-y-0.5">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Main
          </p>
          {NAV_ITEMS.filter((item) => {
            if (item.href === '/reports' && !canViewReports) return false
            return true
          }).map((item) => (
            <div key={item.href}>
              <SidebarNavLink item={item} />
              {item.href === '/dashboard' && <TasksMenu />}
            </div>
          ))}
        </nav>

        {isAdmin && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            <nav className="px-3 space-y-0.5">
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                Administration
              </p>
              {ADMIN_NAV_ITEMS.map((item) => (
                <SidebarNavLink key={item.href} item={item} />
              ))}
            </nav>
          </>
        )}
      </ScrollArea>

      {/* Version footer */}
      <div className="px-6 py-3 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground/30">v1.0.0 — Digital Operations</p>
      </div>
    </aside>
  )
}

function TasksMenu() {
  const submenuId = useId()
  const { pathname } = useLocation()
  const isActive = pathname === '/tasks' || pathname === '/my-tasks'
  const [expanded, setExpanded] = useState(true)

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={submenuId}
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
          isActive ? 'text-sidebar-primary font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )}
      >
        <span className="flex items-center gap-2.5"><ClipboardList className="h-4 w-4" />Tasks</span>
        <ChevronRight className={cn('h-3 w-3 transition-transform', expanded && 'rotate-90')} />
      </button>
      <div id={submenuId} hidden={!expanded} className="ml-5 border-l border-sidebar-border pl-2 space-y-0.5">
        <SidebarNavLink item={{ label: 'My Task', href: '/my-tasks', icon: ClipboardList }} />
        <SidebarNavLink item={{ label: 'Daily Task', href: '/tasks', icon: CalendarDays }} />
      </div>
    </div>
  )
}

function SidebarNavLink({ item }: { item: NavItem }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      className={({ isActive }) =>
        cn(
          'group flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )
      }
    >
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </span>
      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
    </NavLink>
  )
}
