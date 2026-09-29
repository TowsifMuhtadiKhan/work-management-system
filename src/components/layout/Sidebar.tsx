import { useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { fetchDepartments } from '@/services/departments.service'
import { DEFAULT_DEPARTMENT_FEATURES, type DepartmentFeatureId, type Profile } from '@/types/entities'

interface NavItem {
  label: string
  shortLabel?: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  managerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'Dash', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Rush', shortLabel: 'Rush', href: '/rush', icon: Zap },
  { label: 'Content Creator', shortLabel: 'Creator', href: '/content-creator', icon: Clapperboard },
  { label: 'Reports', shortLabel: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Marketing', shortLabel: 'Market', href: '/marketing', icon: TrendingUp },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Employees', shortLabel: 'Staff', href: '/admin/employees', icon: Users },
  { label: 'Departments', shortLabel: 'Depts', href: '/admin/departments', icon: Building2 },
  { label: 'Task Types', shortLabel: 'Types', href: '/admin/task-types', icon: Tags },
  { label: 'Channels', shortLabel: 'Channels', href: '/admin/channels', icon: Radio },
  { label: 'Marketing Ads', shortLabel: 'Ads', href: '/admin/marketing-ads', icon: Megaphone },
  { label: 'Settings', shortLabel: 'Settings', href: '/admin/settings', icon: Settings },
]

interface SidebarProps {
  profile: Profile | null
  className?: string
  collapsed?: boolean
}

export function Sidebar({ profile, className, collapsed = false }: SidebarProps) {
  const isAdmin = profile?.application_role === 'administrator'
  const canViewReports = profile
    ? ['administrator', 'manager', 'team_lead'].includes(profile.application_role)
    : false

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: !isAdmin,
  })

  const userDept = departments.find(d => d.id === profile?.department_id)
  const allowedFeatures: string[] = isAdmin
    ? (DEFAULT_DEPARTMENT_FEATURES as unknown as string[])
    : (userDept?.allowed_features ?? (DEFAULT_DEPARTMENT_FEATURES as unknown as string[]))

  const isFeatureAllowed = (featureId: DepartmentFeatureId) => {
    if (isAdmin) return true
    return allowedFeatures.includes(featureId)
  }

  const showDailyTasks = isFeatureAllowed('daily_tasks')
  const showTasksMenu = showDailyTasks

  return (
    <aside className={cn('flex flex-col h-full min-h-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200', collapsed ? 'w-20' : 'w-60', className)}>
      {/* Logo / Brand */}
      <div className={cn('flex flex-col items-center justify-center border-b border-sidebar-border', collapsed ? 'px-2 py-4' : 'px-6 py-5')}>
        {collapsed ? (
          <BrandLogo compact className="h-10 w-10" />
        ) : (
          <BrandLogo className="w-full" />
        )}
        {!collapsed && <p className="mt-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/60">Digital Content Management</p>}
      </div>

      <ScrollArea className="min-h-0 flex-1 py-4">
        {/* Main Navigation */}
        <nav aria-label="Main" className={cn('space-y-1', collapsed ? 'px-1.5' : 'px-3')}>
          <p className={cn('px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40', collapsed && 'sr-only')}>
            Main
          </p>
          {NAV_ITEMS.filter((item) => {
            if (item.href === '/reports' && !canViewReports) return false
            if (item.href === '/dashboard') return isFeatureAllowed('dashboard')
            if (item.href === '/rush') return isFeatureAllowed('rush')
            if (item.href === '/content-creator') return isFeatureAllowed('content_creator')
            if (item.href === '/reports') return isFeatureAllowed('reports')
            if (item.href === '/marketing') return isFeatureAllowed('marketing')
            return true
          }).map((item) => (
            <div key={item.href}>
              <SidebarNavLink item={item} collapsed={collapsed} />
              {item.href === '/dashboard' && showTasksMenu && (
                <TasksMenu
                  collapsed={collapsed}
                  showDailyTasks={showDailyTasks}
                />
              )}
            </div>
          ))}
          {/* If dashboard is disabled but tasks is enabled, render tasks menu directly */}
          {!isFeatureAllowed('dashboard') && showTasksMenu && (
            <TasksMenu
              collapsed={collapsed}
              showDailyTasks={showDailyTasks}
            />
          )}
        </nav>

        {isAdmin && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            <nav aria-label="Administration" className={cn('space-y-1', collapsed ? 'px-1.5' : 'px-3')}>
              <p className={cn('px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40', collapsed && 'sr-only')}>
                Administration
              </p>
              {ADMIN_NAV_ITEMS.map((item) => (
                <SidebarNavLink key={item.href} item={item} collapsed={collapsed} />
              ))}
            </nav>
          </>
        )}
      </ScrollArea>

      {/* Version footer */}
      <div className={cn('px-6 py-3 border-t border-sidebar-border', collapsed && 'hidden')}>
        <p className="text-[10px] text-sidebar-foreground/30">v1.0.0 — Digital Operations</p>
      </div>
    </aside>
  )
}

function TasksMenu({
  collapsed,
  showDailyTasks = true,
}: {
  collapsed: boolean
  showDailyTasks?: boolean
}) {
  const submenuId = useId()
  const { pathname } = useLocation()
  const isActive = pathname === '/tasks'
  const [expanded, setExpanded] = useState(true)

  if (collapsed) return (
    <div className="space-y-1 mt-1">
      {showDailyTasks && <SidebarNavLink collapsed item={{ label: 'Daily Task', shortLabel: 'Daily', href: '/tasks', icon: CalendarDays }} />}
    </div>
  )

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
        {showDailyTasks && <SidebarNavLink item={{ label: 'Daily Task', href: '/tasks', icon: CalendarDays }} />}
      </div>
    </div>
  )
}

function SidebarNavLink({ item, collapsed = false }: { item: NavItem; collapsed?: boolean }) {
  const Icon = item.icon
  const shortText = item.shortLabel ?? item.label

  return (
    <NavLink
      to={item.href}
      title={item.label}
      aria-label={item.label}
      end={item.href === '/'}
      className={({ isActive }) =>
        cn(
          'group flex items-center justify-between w-full px-3 py-2 rounded-md text-sm transition-colors',
          collapsed && 'flex-col justify-center px-1 py-1.5 min-h-[50px] text-center gap-1',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
        )
      }
    >
      {collapsed ? (
        <>
          <Icon className="h-4 w-4 shrink-0" />
          <span className="text-[10px] leading-tight font-medium tracking-tight truncate max-w-[68px]">
            {shortText}
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-2.5">
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </span>
          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </>
      )}
    </NavLink>
  )
}
