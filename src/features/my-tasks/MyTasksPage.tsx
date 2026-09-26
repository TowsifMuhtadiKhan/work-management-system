import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { useAuth } from '@/hooks/useAuth'
import { fetchTasks } from '@/services/tasks.service'
import { todayISO } from '@/utils/date'
import { formatPercent } from '@/utils/format'
import type { Task } from '@/types/entities'

export function MyTasksPage() {
  const { user } = useAuth()
  const today = todayISO()

  const { data: todayTasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks-today', user?.id],
    queryFn: () => fetchTasks({ assignedTo: user?.id, workDate: today }),
    enabled: !!user?.id,
  })

  const pending = todayTasks.filter((t: Task) =>
    t.status === 'pending' || t.status === 'assigned'
  )
  const inProgress = todayTasks.filter((t: Task) => t.status === 'in_progress')
  const done = todayTasks.filter((t: Task) => t.status === 'done')
  const other = todayTasks.filter((t: Task) =>
    t.status === 'hold' || t.status === 'cancelled'
  )

  const completionRate = todayTasks.length > 0
    ? Math.round((done.length / todayTasks.length) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">My Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your assignments for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: todayTasks.length, color: 'text-foreground' },
          { label: 'Done', value: done.length, color: 'text-green-600 dark:text-green-400' },
          { label: 'In Progress', value: inProgress.length, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Pending', value: pending.length, color: 'text-muted-foreground' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {todayTasks.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium">Completion</span>
              <span className="font-bold text-green-600">{formatPercent(completionRate, 0)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Tabs */}
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today ({todayTasks.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <TaskList tasks={todayTasks} loading={isLoading} emptyText="No tasks assigned to you today" />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <TaskList tasks={pending} loading={isLoading} emptyText="No pending tasks" />
        </TabsContent>
        <TabsContent value="in_progress" className="mt-4">
          <TaskList tasks={inProgress} loading={isLoading} emptyText="No tasks in progress" />
        </TabsContent>
        <TabsContent value="done" className="mt-4">
          <TaskList tasks={done} loading={isLoading} emptyText="No completed tasks yet" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TaskList({
  tasks,
  loading,
  emptyText,
}: {
  tasks: Task[]
  loading: boolean
  emptyText: string
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <p className="text-sm">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{task.file_name}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <StatusBadge status={task.status} size="sm" />
                  <PriorityBadge priority={task.priority} />
                  {task.task_type && (
                    <span
                      className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: task.task_type.color_hex + '22',
                        color: task.task_type.color_hex,
                      }}
                    >
                      {task.task_type.code}
                    </span>
                  )}
                  {task.channel && (
                    <span className="text-[10px] text-muted-foreground">{task.channel.name}</span>
                  )}
                </div>
                {task.remarks && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.remarks}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
