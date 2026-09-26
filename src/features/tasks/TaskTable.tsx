import { useState } from 'react'
import { ExternalLink, Edit, History, Trash2, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { UserAvatar } from '@/components/common/UserAvatar'
import { TaskFormDialog } from '@/features/tasks/TaskFormDialog'
import { TaskHistoryDrawer } from '@/features/tasks/TaskHistoryDrawer'
import { usePermissions } from '@/hooks/usePermissions'
import { deleteTask } from '@/services/tasks.service'
import { formatRelative } from '@/utils/date'
import { shortenUrl } from '@/utils/format'
import type { Task, Profile } from '@/types/entities'

interface TaskTableProps {
  tasks: Task[]
  currentProfile: Profile | null
  onRefetch: () => void
}

export function TaskTable({ tasks, currentProfile, onRefetch }: TaskTableProps) {
  const { isAdmin, canEditTask } = usePermissions(currentProfile)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [historyTask, setHistoryTask] = useState<Task | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTaskId) return
    setDeleting(true)
    try {
      await deleteTask(deleteTaskId)
      toast.success('Task deleted')
      onRefetch()
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
      setDeleteTaskId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="task-table text-xs">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-6 text-center">#</TableHead>
              <TableHead className="min-w-[160px]">File Name</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="min-w-[140px]">Assigned Person</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead className="min-w-[120px]">Channel / Page</TableHead>
              <TableHead className="min-w-[120px]">Marketing Ad</TableHead>
              <TableHead className="min-w-[150px]">Remarks / Caption</TableHead>
              <TableHead className="w-20">YouTube</TableHead>
              <TableHead className="w-20">Facebook</TableHead>
              <TableHead className="w-24">Drive</TableHead>
              <TableHead className="w-28">Last Updated</TableHead>
              <TableHead className="w-12 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task, index) => {
              const canEdit = canEditTask(task.assigned_to, task.assigned_profile as any)

              return (
                <TableRow key={task.id} className="group">
                  <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>

                  {/* File Name */}
                  <TableCell className="font-medium">
                    <span className="line-clamp-1" title={task.file_name}>
                      {task.file_name}
                    </span>
                  </TableCell>

                  {/* Task Type */}
                  <TableCell>
                    {task.task_type ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: task.task_type.color_hex + '22',
                          color: task.task_type.color_hex,
                        }}
                      >
                        {task.task_type.code}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Assigned Person */}
                  <TableCell>
                    {task.assigned_profile ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={task.assigned_profile.full_name}
                          avatarUrl={task.assigned_profile.avatar_url}
                          size="xs"
                          showTooltip
                        />
                        <div>
                          <p className="font-medium line-clamp-1">
                            {task.assigned_profile.full_name}
                          </p>
                          {task.assigned_profile.employee_code && (
                            <p className="text-[10px] text-muted-foreground">
                              {task.assigned_profile.employee_code}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge status={task.status} size="sm" />
                  </TableCell>

                  {/* Priority */}
                  <TableCell>
                    <PriorityBadge priority={task.priority} />
                  </TableCell>

                  {/* Channel */}
                  <TableCell>
                    <span className="text-muted-foreground line-clamp-1">
                      {task.channel?.name ?? '—'}
                    </span>
                  </TableCell>

                  {/* Marketing Ad */}
                  <TableCell>
                    {task.marketing_ad ? (
                      <div>
                        <p className="line-clamp-1">{task.marketing_ad.advertiser}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {task.marketing_ad.package_type}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Remarks / Caption */}
                  <TableCell>
                    {task.remarks || task.caption ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="line-clamp-2 cursor-help">
                            {task.remarks || task.caption}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {task.remarks && <p><strong>Remarks:</strong> {task.remarks}</p>}
                          {task.caption && <p><strong>Caption:</strong> {task.caption}</p>}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* YouTube */}
                  <TableCell>
                    {task.youtube_link ? (
                      <a
                        href={task.youtube_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                        title={task.youtube_link}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{shortenUrl(task.youtube_link)}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Facebook */}
                  <TableCell>
                    {task.facebook_link ? (
                      <a
                        href={task.facebook_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                        title={task.facebook_link}
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>{shortenUrl(task.facebook_link)}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Google Drive */}
                  <TableCell>
                    {task.google_drive_link ? (
                      <a
                        href={task.google_drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green-600 hover:underline"
                        title={task.google_drive_link}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Drive
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Last Updated */}
                  <TableCell className="text-muted-foreground text-[10px]">
                    {formatRelative(task.updated_at || task.created_at)}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onClick={() => setHistoryTask(task)}
                          className="text-xs"
                        >
                          <History className="mr-2 h-3.5 w-3.5" />
                          View History
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setEditTask(task)}
                              className="text-xs"
                            >
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              Edit Task
                            </DropdownMenuItem>
                            {isAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTaskId(task.id)}
                                  className="text-xs text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      {editTask && (
        <TaskFormDialog
          mode="edit"
          task={editTask}
          workDate={editTask.work_date}
          currentProfile={currentProfile}
          open={!!editTask}
          onOpenChange={(open) => !open && setEditTask(null)}
          onSuccess={() => {
            setEditTask(null)
            onRefetch()
            toast.success('Task updated')
          }}
        />
      )}

      {/* History Drawer */}
      {historyTask && (
        <TaskHistoryDrawer
          task={historyTask}
          open={!!historyTask}
          onClose={() => setHistoryTask(null)}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task and its entire history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
