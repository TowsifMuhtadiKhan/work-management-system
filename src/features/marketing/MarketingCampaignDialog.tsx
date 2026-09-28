import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Copy,
  Check,
} from 'lucide-react'
import { PlatformIcon } from '@/features/tasks/PlatformIcon'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { fetchMarketingTasks } from '@/services/tasks.service'
import { exportMarketingReportToExcel } from '@/utils/export'
import { captionText } from '@/utils/caption'
import { todayISO, addDays, formatDateISO } from '@/utils/date'
import { Pagination } from '@/components/common/Pagination'
import { StatusBadge } from '@/components/common/StatusBadge'
import type { MarketingAd, Task } from '@/types/entities'

interface MarketingCampaignDialogProps {
  ad: MarketingAd | null
  onClose: () => void
}

export function MarketingCampaignDialog({ ad, onClose }: MarketingCampaignDialogProps) {
  const today = todayISO()
  const defaultStart = ad?.valid_from || addDays(today, -30)
  const defaultEnd = ad?.valid_to && ad.valid_to >= today ? ad.valid_to : today

  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null)

  const tasksQuery = useQuery({
    queryKey: ['marketing-campaign-tasks', ad?.id, startDate, endDate],
    queryFn: () => (ad ? fetchMarketingTasks(ad.id, startDate, endDate) : Promise.resolve([])),
    enabled: !!ad,
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [startDate, endDate])

  if (!ad) return null

  const tasks: Task[] = tasksQuery.data ?? []
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const pendingTasks = totalTasks - doneTasks
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const paginatedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleCopyCaption = (taskId: string, caption: string) => {
    const text = captionText(caption)
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedCaptionId(taskId)
    toast.success('Caption copied to clipboard')
    setTimeout(() => setCopiedCaptionId(null), 2000)
  }

  const handleExport = () => {
    if (!tasks.length) {
      toast.error('No tasks available to export for this date range')
      return
    }
    try {
      exportMarketingReportToExcel(ad.advertiser, ad.package_type, startDate, endDate, tasks)
      toast.success('Excel report downloaded')
    } catch {
      toast.error('Failed to export Excel report')
    }
  }

  const setRangePreset = (days: number) => {
    const end = todayISO()
    const start = addDays(todayISO(), -days)
    setStartDate(start)
    setEndDate(end)
  }

  const setTodayPreset = () => {
    const t = todayISO()
    setStartDate(t)
    setEndDate(t)
  }

  const setMonthPreset = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(formatDateISO(firstDay))
    setEndDate(formatDateISO(lastDay))
  }

  const setCampaignPreset = () => {
    if (ad?.valid_from && ad?.valid_to) {
      setStartDate(ad.valid_from)
      setEndDate(ad.valid_to)
    } else {
      setRangePreset(30)
    }
  }

  const setAllTimePreset = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <Dialog open={!!ad} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                {ad.advertiser}
                <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                  {ad.is_active ? 'Active Campaign' : 'Inactive'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                <span className="font-semibold text-foreground">{ad.package_type}</span>
                {ad.daily_target ? ` · Daily Target: ${ad.daily_target} tasks/day` : ''}
                {ad.valid_from && ad.valid_to ? ` · Campaign Period: ${ad.valid_from} to ${ad.valid_to}` : ''}
              </DialogDescription>
            </div>
            <Button
              onClick={handleExport}
              disabled={tasksQuery.isPending || !tasks.length}
              className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Download Excel
            </Button>
          </div>
        </DialogHeader>

        {/* Date Duration Picker & Quick Filters */}
        <div className="rounded-lg border bg-muted/40 p-4 space-y-3 mt-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">Duration:</span>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="duration-from" className="text-xs text-muted-foreground">From</label>
                <Input
                  id="duration-from"
                  type="date"
                  className="w-36 h-8 text-xs bg-background"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="duration-to" className="text-xs text-muted-foreground">To</label>
                <Input
                  id="duration-to"
                  type="date"
                  className="w-36 h-8 text-xs bg-background"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {ad.valid_from && ad.valid_to && (
                <Button
                  type="button"
                  variant={startDate === ad.valid_from && endDate === ad.valid_to ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={setCampaignPreset}
                >
                  Campaign Period
                </Button>
              )}
              <Button
                type="button"
                variant={startDate === todayISO() && endDate === todayISO() ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={setTodayPreset}
              >
                Today
              </Button>
              <Button
                type="button"
                variant={startDate === addDays(todayISO(), -7) && endDate === todayISO() ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setRangePreset(7)}
              >
                Last 7 Days
              </Button>
              <Button
                type="button"
                variant={startDate === addDays(todayISO(), -30) && endDate === todayISO() ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setRangePreset(30)}
              >
                Last 30 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={setMonthPreset}
              >
                This Month
              </Button>
              <Button
                type="button"
                variant={!startDate && !endDate ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={setAllTimePreset}
              >
                All Tasks
              </Button>
            </div>
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
            <div className="bg-background rounded-md p-2.5 border">
              <p className="text-xs text-muted-foreground">Total Tasks</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{totalTasks}</p>
            </div>
            <div className="bg-background rounded-md p-2.5 border">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Done (Delivered)
              </p>
              <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5">
                {doneTasks}
              </p>
            </div>
            <div className="bg-background rounded-md p-2.5 border">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> In Progress / Pending
              </p>
              <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300 mt-0.5">
                {pendingTasks}
              </p>
            </div>
            <div className="bg-background rounded-md p-2.5 border">
              <p className="text-xs text-muted-foreground">Delivery Rate</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{completionRate}%</p>
            </div>
          </div>
        </div>

        {/* Task List / Report Table */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Campaign Tasks ({tasks.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Sorted by date (latest first)
            </span>
          </div>

          {tasksQuery.isPending ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading campaign tasks...
            </div>
          ) : tasksQuery.isError ? (
            <div className="py-8 text-center text-sm text-destructive">
              Failed to load tasks for this campaign.
            </div>
          ) : !tasks.length ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
              {!startDate && !endDate
                ? 'No tasks found for this campaign.'
                : startDate && endDate
                ? `No tasks found for this campaign between ${startDate} and ${endDate}.`
                : startDate
                ? `No tasks found for this campaign from ${startDate} onwards.`
                : `No tasks found for this campaign up to ${endDate}.`}
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="min-w-44">File Name</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="min-w-36">Assigned To</TableHead>
                    <TableHead className="min-w-56">Caption</TableHead>
                    <TableHead className="w-28 text-center">Links</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map(task => {
                    const caption = captionText(task.caption)
                    return (
                      <TableRow key={task.id} className="text-xs sm:text-sm">
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {task.work_date}
                        </TableCell>
                        <TableCell className="font-medium max-w-xs truncate" title={task.file_name}>
                          <div>{task.file_name}</div>
                          {task.task_type && (
                            <span className="text-[10px] text-muted-foreground">
                              {task.task_type.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={task.status} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {task.assigned_profile?.full_name ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {caption ? (
                            <div className="flex items-start gap-1.5 group">
                              <p className="line-clamp-2 text-xs text-muted-foreground" title={caption}>
                                {caption}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 shrink-0 opacity-80 hover:opacity-100"
                                title="Copy caption"
                                onClick={() => handleCopyCaption(task.id, task.caption ?? '')}
                              >
                                {copiedCaptionId === task.id ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No caption</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            {task.facebook_link ? (
                              <a
                                href={task.facebook_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:opacity-80 transition-opacity"
                                title={`Open Facebook: ${task.facebook_link}`}
                              >
                                <PlatformIcon platform="Facebook link" />
                              </a>
                            ) : (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-30 grayscale"
                                title="No Facebook link"
                              >
                                <PlatformIcon platform="Facebook link" />
                              </span>
                            )}

                            {task.youtube_link ? (
                              <a
                                href={task.youtube_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:opacity-80 transition-opacity"
                                title={`Open YouTube: ${task.youtube_link}`}
                              >
                                <PlatformIcon platform="YouTube link" />
                              </a>
                            ) : (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-30 grayscale"
                                title="No YouTube link"
                              >
                                <PlatformIcon platform="YouTube link" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {tasks.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={tasks.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>

        <DialogFooter className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!tasks.length}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .XLSX
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
