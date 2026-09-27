import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { fetchTasks, fetchDailyStats } from '@/services/tasks.service'
import { exportTasksToExcel, exportTasksToCSV } from '@/utils/export'
import { todayISO, formatDate, formatDateISO } from '@/utils/date'
import { formatPercent } from '@/utils/format'
import type { Task } from '@/types/entities'

export function ReportsPage() {
  const today = todayISO()
  const [reportDate, setReportDate] = useState(today)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['report-tasks', reportDate],
    queryFn: () => fetchTasks({ workDate: reportDate }),
  })

  const { data: stats } = useQuery({
    queryKey: ['daily-stats', reportDate],
    queryFn: () => fetchDailyStats(reportDate),
  })

  const handleExport = () => {
    if (tasks.length === 0) {
      toast.warning('No tasks to export for this date')
      return
    }
    try {
      if (exportFormat === 'xlsx') {
        exportTasksToExcel(tasks, reportDate)
      } else {
        exportTasksToCSV(tasks, reportDate)
      }
      toast.success(`Exported as ${exportFormat.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  // Status breakdown
  const statusCounts = {
    pending: tasks.filter((t: Task) => t.status === 'pending').length,
    assigned: tasks.filter((t: Task) => t.status === 'assigned').length,
    in_progress: tasks.filter((t: Task) => t.status === 'in_progress').length,
    done: tasks.filter((t: Task) => t.status === 'done').length,
    hold: tasks.filter((t: Task) => t.status === 'hold').length,
    cancelled: tasks.filter((t: Task) => t.status === 'cancelled').length,
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Daily task performance summary</p>
      </div>

      {/* Date Selector + Export */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-date" className="text-xs">Report Date</Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                max={formatDateISO(new Date())}
                className="h-9 w-44"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Export Format</Label>
              <Select
                value={exportFormat}
                onValueChange={(v) => setExportFormat(v as 'xlsx' | 'csv')}
              >
                <SelectTrigger className="h-9 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport} size="sm" className="h-9">
              {exportFormat === 'xlsx' ? (
                <Download className="mr-1.5 h-4 w-4" />
              ) : (
                <FileDown className="mr-1.5 h-4 w-4" />
              )}
              Export {exportFormat.toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Assigned" value={stats?.total ?? 0} />
        <SummaryCard label="Completed" value={stats?.done ?? 0} color="text-green-600" />
        <SummaryCard label="Pending" value={(stats?.pending ?? 0) + (stats?.assigned ?? 0)} color="text-amber-600" />
        <SummaryCard
          label="Completion Rate"
          value={`${formatPercent(stats?.completion_rate ?? 0)}`}
          color="text-blue-600"
          isText
        />
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Status Breakdown — {formatDate(reportDate)}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {(Object.entries(statusCounts) as [Task['status'], number][]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <StatusBadge status={status} size="sm" />
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: stats?.total ? `${(count / stats.total) * 100}%` : '0%',
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">All Tasks — {formatDate(reportDate)}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tasks found for this date
            </p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task: Task, i: number) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-2 border-b last:border-0 text-xs"
                >
                  <span className="text-muted-foreground w-5 shrink-0">{i + 1}</span>
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

function SummaryCard({
  label,
  value,
  color,
  isText,
}: {
  label: string
  value: number | string
  color?: string
  isText?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`${isText ? 'text-2xl' : 'text-3xl'} font-bold mt-1 ${color ?? ''}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
