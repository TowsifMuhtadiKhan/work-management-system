import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateNavigator } from '@/components/common/DateNavigator'
import { TaskFiltersPanel } from './TaskFilters'
import { TaskSheet } from './TaskSheet'
import { MarketingDailySheet } from './MarketingDailySheet'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useTasksRealtime } from '@/hooks/useRealtime'
import { fetchTasks } from '@/services/tasks.service'
import { exportTasksToExcel } from '@/utils/export'
import { todayISO } from '@/utils/date'
import type { TaskFilters } from '@/types/entities'

export function DailyTasksPage({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth()
  const profile = useProfile(user?.id)
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date')
  const workDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && !Number.isNaN(Date.parse(dateParam)) ? dateParam : todayISO()
  const setWorkDate = (date: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set('date', date); return next }, { replace: true })
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Omit<TaskFilters, 'workDate' | 'search'>>({})
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formattedToday = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  useTasksRealtime(workDate)
  const queryFilters = { ...filters, workDate, search, ...(mine ? { assignedTo: user?.id } : {}) }
  const query = useQuery({ queryKey: ['tasks', workDate, search, filters, mine ? user?.id : 'all'], queryFn: () => fetchTasks(queryFilters), enabled: !!user?.id })
  const tasks = query.data ?? []
  return <div className="flex flex-col h-full">
    <div className="border-b px-3 sm:px-6 py-4 space-y-3 bg-gradient-to-r from-rose-50 via-background to-indigo-50 dark:from-rose-950/30 dark:to-indigo-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold">{mine ? 'My Tasks' : 'Daily Tasks'}</h1><p className="text-sm text-muted-foreground">{mine ? 'Your assignments, organized by time.' : 'Add rows under a time section, fill in the cells, then save each row.'}</p></div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border bg-card/90 shadow-xs text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-foreground">{formattedToday}</span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center gap-1.5 font-mono font-bold text-foreground tabular-nums">
            <Clock className="h-4 w-4 text-primary" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <DateNavigator date={workDate} onDateChange={setWorkDate} />
        <div className="flex flex-wrap gap-2">
          <MarketingDailySheet workDate={workDate} />
          <Input aria-label="Search file name" placeholder="Search file name..." className="w-48" value={search} onChange={e => setSearch(e.target.value)} />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>Filters</Button>
          <Button variant="outline" onClick={() => void query.refetch()}>Refresh</Button>
          <Button variant="outline" onClick={() => { if (!tasks.length) toast.warning('No tasks to export'); else { try { exportTasksToExcel(tasks, workDate) } catch { toast.error('Export failed') } } }}>Export</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 px-3 py-1.5">{tasks.length} tasks</span>
        <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 px-3 py-1.5">{tasks.filter(t => t.status === 'done').length} done</span>
        <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 px-3 py-1.5">{tasks.filter(t => t.status === 'in_progress').length} in progress</span>
      </div>
    </div>
    {showFilters && <TaskFiltersPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} hideAssignee={mine} />}
    <div className="flex-1 overflow-auto">
      {query.isError || profile.isError ? <p role="alert" className="p-6 text-destructive">Unable to load tasks. Please refresh and try again.</p>
        : query.isPending || profile.isPending ? <p role="status" className="p-6">Loading tasks...</p>
        : profile.data && <TaskSheet key={workDate + String(mine)} tasks={tasks} profile={profile.data} workDate={workDate} mine={mine} />}
    </div>
  </div>
}
