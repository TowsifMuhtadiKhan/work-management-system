import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Download, Filter, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DateNavigator } from '@/components/common/DateNavigator'
import { TaskTable } from '@/features/tasks/TaskTable'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskFiltersPanel } from '@/features/tasks/TaskFilters'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { usePermissions } from '@/hooks/usePermissions'
import { useTasksRealtime } from '@/hooks/useRealtime'
import { fetchTasks } from '@/services/tasks.service'
import { exportTasksToExcel } from '@/utils/export'
import { todayISO } from '@/utils/date'
import type { TaskFilters } from '@/types/entities'

export function DailyTasksPage() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const { canCreateTask } = usePermissions(profile)

  const [workDate, setWorkDate] = useState(todayISO())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Omit<TaskFilters, 'workDate' | 'search'>>({})

  // Realtime subscription for today's tasks
  useTasksRealtime(workDate)

  const queryFilters: TaskFilters = { workDate, search, ...filters }

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks', workDate, search, filters],
    queryFn: () => fetchTasks(queryFilters),
    staleTime: 30 * 1000,
  })

  const handleExport = () => {
    if (tasks.length === 0) {
      toast.warning('No tasks to export')
      return
    }
    try {
      exportTasksToExcel(tasks, workDate)
      toast.success('Exported successfully')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Date Navigation */}
          <DateNavigator date={workDate} onDateChange={setWorkDate} />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search file name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-44 text-xs"
              />
            </div>

            {/* Filter toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filters
            </Button>

            {/* Refresh */}
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>

            {/* Add Assignment */}
            {canCreateTask() && (
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Assignment
              </Button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {!isLoading && tasks.length > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{tasks.length} tasks</span>
            <span>·</span>
            <span className="text-green-600 dark:text-green-400">
              {tasks.filter((t) => t.status === 'done').length} done
            </span>
            <span>·</span>
            <span className="text-amber-600 dark:text-amber-400">
              {tasks.filter((t) => t.status === 'in_progress').length} in progress
            </span>
            <span>·</span>
            <span>
              {tasks.filter((t) => t.status === 'pending' || t.status === 'assigned').length} pending
            </span>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <TaskFiltersPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-base font-medium">No tasks for this date</p>
            <p className="text-sm mt-1">
              {canCreateTask()
                ? 'Click "Add Assignment" to create the first task.'
                : 'Check back later or navigate to another date.'}
            </p>
          </div>
        ) : (
          <TaskTable
            tasks={tasks}
            currentProfile={profile ?? null}
            onRefetch={refetch}
          />
        )}
      </div>

      {/* Add Task Dialog */}
      {showAddDialog && (
        <TaskFormDialog
          mode="create"
          workDate={workDate}
          currentProfile={profile ?? null}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={() => {
            refetch()
            toast.success('Task created successfully')
          }}
        />
      )}
    </div>
  )
}
