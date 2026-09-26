import { captionText } from '@/utils/caption'
import { useQuery } from '@tanstack/react-query'
import { X, Clock, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { UserAvatar } from '@/components/common/UserAvatar'
import { fetchTaskHistory } from '@/services/taskHistory.service'
import { formatDateTime } from '@/utils/date'
import type { Task } from '@/types/entities'

interface TaskHistoryDrawerProps {
  task: Task
  open: boolean
  onClose: () => void
}

const FIELD_LABELS: Record<string, string> = {
  time_slot: 'Time Section',
  created: 'Task Created',
  file_name: 'File Name',
  task_type_id: 'Task Type',
  assigned_to: 'Assigned To',
  status: 'Status',
  channel_id: 'Channel',
  marketing_ad_id: 'Marketing Ad',
  remarks: 'Remarks',
  caption: 'Caption',
  youtube_link: 'YouTube Link',
  facebook_link: 'Facebook Link',
  google_drive_link: 'Google Drive Link',
  priority: 'Priority',
}

export function TaskHistoryDrawer({ task, open, onClose }: TaskHistoryDrawerProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['task-history', task.id],
    queryFn: () => fetchTaskHistory(task.id),
    enabled: open,
  })

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-96 bg-background border-l shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="font-semibold text-sm">Task History</h2>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {task.file_name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No history recorded yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {history.map((entry, index) => (
                  <div key={entry.id}>
                    <div className="flex gap-3 py-3">
                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        {entry.changed_by_profile ? (
                          <UserAvatar
                            name={entry.changed_by_profile.full_name}
                            avatarUrl={entry.changed_by_profile.avatar_url}
                            size="xs"
                          />
                        ) : (
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">
                            {entry.changed_by_profile?.full_name ?? 'Unknown'}
                          </p>
                          <time className="text-[10px] text-muted-foreground shrink-0">
                            {formatDateTime(entry.changed_at)}
                          </time>
                        </div>

                        {entry.field_name === 'created' ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Created task:{' '}
                            <span className="font-medium text-foreground">
                              {entry.new_value}
                            </span>
                          </p>
                        ) : (
                          <div className="mt-1">
                            <p className="text-xs text-muted-foreground">
                              Changed{' '}
                              <span className="font-medium text-foreground">
                                {FIELD_LABELS[entry.field_name] ?? entry.field_name}
                              </span>
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {entry.old_value && (
                                <span className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded line-through">
                                  {entry.field_name === 'caption' ? captionText(entry.old_value) : entry.old_value}
                                </span>
                              )}
                              {entry.old_value && entry.new_value && (
                                <span className="text-muted-foreground text-[10px]">→</span>
                              )}
                              {entry.new_value && (
                                <span className="text-[10px] bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                  {entry.field_name === 'caption' ? captionText(entry.new_value) : entry.new_value}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {index < history.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
