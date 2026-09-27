import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, AlertCircle, BarChart3, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { fetchDailyStats, fetchTasks, fetchTasksByEmployee } from '@/services/tasks.service'
import { fetchMarketingAds, fetchMarketingProgress } from '@/services/marketingAds.service'
import { todayISO, formatDate } from '@/utils/date'
import { formatPercent } from '@/utils/format'
import type { Task } from '@/types/entities'

export function DashboardPage() {
  const today = todayISO()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['daily-stats', today],
    queryFn: () => fetchDailyStats(today),
    refetchInterval: 60 * 1000, // refresh every 60s
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', today, '', {}],
    queryFn: () => fetchTasks({ workDate: today }),
    staleTime: 30 * 1000,
  })

  const { data: employeeData = [] } = useQuery({
    queryKey: ['tasks-by-employee', today],
    queryFn: () => fetchTasksByEmployee(today),
  })

  const { data: marketingAds = [] } = useQuery({
    queryKey: ['marketing-ads'],
    queryFn: fetchMarketingAds,
  })

  const { data: marketingProgress = [] } = useQuery({
    queryKey: ['marketing-progress', today],
    queryFn: () => fetchMarketingProgress(today),
  })

  // Aggregate employee stats
  const employeeMap = new Map<string, { name: string; code: string; avatar: string | null; total: number; done: number; in_progress: number }>()
  employeeData.forEach((row: any) => {
    if (!row.assigned_profile) return
    const id = row.assigned_to
    const prev = employeeMap.get(id) ?? {
      name: row.assigned_profile.full_name,
      code: row.assigned_profile.employee_code ?? '',
      avatar: row.assigned_profile.avatar_url,
      total: 0, done: 0, in_progress: 0,
    }
    employeeMap.set(id, {
      ...prev,
      total: prev.total + 1,
      done: prev.done + (row.status === 'done' ? 1 : 0),
      in_progress: prev.in_progress + (row.status === 'in_progress' ? 1 : 0),
    })
  })
  const employeeStats = Array.from(employeeMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Task type breakdown
  const typeMap = new Map<string, { name: string; code: string; color: string; count: number }>()
  tasks.forEach((task: Task) => {
    if (!task.task_type) return
    const prev = typeMap.get(task.task_type_id) ?? {
      name: task.task_type.name, code: task.task_type.code,
      color: task.task_type.color_hex, count: 0,
    }
    typeMap.set(task.task_type_id, { ...prev, count: prev.count + 1 })
  })
  const typeStats = Array.from(typeMap.values()).sort((a, b) => b.count - a.count)

  // Marketing progress
  const marketingCompletedMap = new Map<string, number>()
  marketingProgress.forEach((row: any) => {
    if (row.marketing_ad_id && row.status === 'done') {
      marketingCompletedMap.set(
        row.marketing_ad_id,
        (marketingCompletedMap.get(row.marketing_ad_id) ?? 0) + 1
      )
    }
  })

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Operations Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formatDate(today)} · Live</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          loading={statsLoading}
          title="Total Tasks"
          value={stats?.total ?? 0}
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
          subtitle="Today's assignments"
        />
        <StatCard
          loading={statsLoading}
          title="Completed"
          value={stats?.done ?? 0}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          subtitle={`${formatPercent(stats?.completion_rate ?? 0)} completion`}
          valueClassName="text-green-600 dark:text-green-400"
        />
        <StatCard
          loading={statsLoading}
          title="In Progress"
          value={stats?.in_progress ?? 0}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          subtitle="Currently being worked"
          valueClassName="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          loading={statsLoading}
          title="Pending"
          value={(stats?.pending ?? 0) + (stats?.assigned ?? 0)}
          icon={<AlertCircle className="h-5 w-5 text-slate-500" />}
          subtitle="Awaiting action"
        />
      </div>

      {/* Completion Rate Bar */}
      {stats && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Completion</span>
              <span className="text-sm font-bold text-green-600">
                {formatPercent(stats.completion_rate)}
              </span>
            </div>
            <Progress value={stats.completion_rate} className="h-3" />
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span>✓ Done: {stats.done}</span>
              <span>⟳ In Progress: {stats.in_progress}</span>
              <span>○ Pending: {stats.pending + stats.assigned}</span>
              <span>⏸ Hold: {stats.hold}</span>
              <span>✕ Cancelled: {stats.cancelled}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks by Employee */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tasks by Employee
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {employeeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tasks today</p>
            ) : (
              <div className="space-y-2">
                {employeeStats.map((emp) => (
                  <div key={emp.name} className="flex items-center gap-3">
                    <UserAvatar name={emp.name} avatarUrl={emp.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium line-clamp-1">{emp.name}</p>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {emp.done}/{emp.total}
                        </span>
                      </div>
                      <Progress
                        value={emp.total > 0 ? (emp.done / emp.total) * 100 : 0}
                        className="h-1.5 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tasks by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {typeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tasks today</p>
            ) : (
              <div className="space-y-2">
                {typeStats.map((type) => (
                  <div key={type.code} className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                      style={{ background: type.color + '22', color: type.color }}
                    >
                      {type.code}
                    </span>
                    <div className="flex-1">
                      <Progress
                        value={stats?.total ? (type.count / stats.total) * 100 : 0}
                        className="h-1.5"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 w-4 text-right">
                      {type.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Marketing Progress */}
      {marketingAds.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Marketing Targets — Today
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketingAds.map((ad) => {
                const completed = marketingCompletedMap.get(ad.id) ?? 0
                const pct = ad.daily_target > 0
                  ? Math.min(100, Math.round((completed / ad.daily_target) * 100))
                  : 0
                const remaining = Math.max(0, ad.daily_target - completed)

                return (
                  <div key={ad.id} className="p-3 rounded-lg border bg-card">
                    <p className="text-xs font-semibold">{ad.advertiser}</p>
                    <p className="text-[10px] text-muted-foreground">{ad.package_type}</p>
                    <Progress value={pct} className="h-1.5 mt-2" />
                    <div className="flex justify-between text-[10px] mt-1.5 text-muted-foreground">
                      <span>Target: {ad.daily_target}</span>
                      <span className="text-green-600 dark:text-green-400">Done: {completed}</span>
                      <span className="text-amber-600">Left: {remaining}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {tasksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.slice(0, 8).map((task: Task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-1.5 text-xs"
                >
                  <StatusBadge status={task.status} size="sm" />
                  <span className="flex-1 font-medium line-clamp-1">{task.file_name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {task.assigned_profile?.full_name ?? '—'}
                  </span>
                  {task.task_type && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                      style={{
                        background: task.task_type.color_hex + '22',
                        color: task.task_type.color_hex,
                      }}
                    >
                      {task.task_type.code}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  loading,
  title,
  value,
  icon,
  subtitle,
  valueClassName,
}: {
  loading: boolean
  title: string
  value: number
  icon: React.ReactNode
  subtitle: string
  valueClassName?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-bold ${valueClassName ?? ''}`}>{value}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
