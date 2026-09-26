import { taskCompletionError } from '@/utils/taskCompletion'
import { CaptionEditor } from './CaptionEditor'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { createTask, updateTask } from '@/services/tasks.service'
import { fetchAssignableProfiles } from '@/services/profiles.service'
import { fetchTaskTypes } from '@/services/taskTypes.service'
import { fetchChannels } from '@/services/channels.service'
import { fetchMarketingAds } from '@/services/marketingAds.service'
import type { Task, Profile } from '@/types/entities'
import type { TaskFormValues } from '@/types/entities'

interface TaskFormDialogProps {
  mode: 'create' | 'edit'
  task?: Task
  workDate: string
  currentProfile: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const DEFAULT_FORM: TaskFormValues = {
  work_date: '',
  file_name: '',
  task_type_id: '',
  assigned_to: '',
  status: 'pending',
  channel_id: '',
  marketing_ad_id: '',
  remarks: '',
  caption: '',
  youtube_link: '',
  facebook_link: '',
  google_drive_link: '',
  priority: 'normal',
}

export function TaskFormDialog({
  mode,
  task,
  workDate,
  currentProfile,
  open,
  onOpenChange,
  onSuccess,
}: TaskFormDialogProps) {
  const [form, setForm] = useState<TaskFormValues>({
    ...DEFAULT_FORM,
    work_date: workDate,
  })
  const [submitting, setSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && task) {
      setForm({
        work_date: task.work_date,
        file_name: task.file_name,
        task_type_id: task.task_type_id,
        assigned_to: task.assigned_to,
        status: task.status,
        channel_id: task.channel_id ?? '',
        marketing_ad_id: task.marketing_ad_id ?? '',
        remarks: task.remarks ?? '',
        caption: task.caption ?? '',
        youtube_link: task.youtube_link ?? '',
        facebook_link: task.facebook_link ?? '',
        google_drive_link: task.google_drive_link ?? '',
        priority: task.priority,
      })
    } else {
      setForm({ ...DEFAULT_FORM, work_date: workDate })
    }
  }, [mode, task, workDate])

  // Reference data
  const { data: profiles = [] } = useQuery({
    queryKey: ['assignable-profiles'],
    queryFn: fetchAssignableProfiles,
    staleTime: 5 * 60 * 1000,
  })
  const { data: taskTypes = [] } = useQuery({
    queryKey: ['task-types'],
    queryFn: fetchTaskTypes,
    staleTime: 10 * 60 * 1000,
  })
  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: fetchChannels,
    staleTime: 10 * 60 * 1000,
  })
  const { data: marketingAds = [] } = useQuery({
    queryKey: ['marketing-ads'],
    queryFn: fetchMarketingAds,
    staleTime: 10 * 60 * 1000,
  })

  const set = (field: keyof TaskFormValues) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.file_name.trim() || !form.task_type_id || !form.assigned_to) {
      return
    }
    if (!currentProfile) return
    const completionError = taskCompletionError(form)
    if (form.status === 'done' && completionError) { alert(completionError); return }

    setSubmitting(true)
    try {
      const payload = {
        work_date: form.work_date,
        file_name: form.file_name.trim(),
        task_type_id: form.task_type_id,
        assigned_to: form.assigned_to,
        status: form.status as Task['status'],
        channel_id: form.channel_id || null,
        marketing_ad_id: form.marketing_ad_id || null,
        remarks: form.remarks.trim() || null,
        caption: form.caption.trim() || null,
        youtube_link: form.youtube_link.trim() || null,
        facebook_link: form.facebook_link.trim() || null,
        google_drive_link: form.google_drive_link.trim() || null,
        priority: form.priority as Task['priority'],
      }

      if (mode === 'create') {
        await createTask({ ...payload, created_by: currentProfile.id })
      } else if (mode === 'edit' && task) {
        await updateTask(task.id, { ...payload, updated_by: currentProfile.id })
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save task'
      // Surface RLS errors clearly
      if (msg.includes('RLS') || msg.includes('policy')) {
        alert('Permission denied: you are not authorized to edit this task.')
      } else {
        alert(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add Assignment' : 'Edit Task'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Creating task for ${form.work_date}`
              : `Editing: ${task?.file_name}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Row 1: File Name */}
          <div className="space-y-1.5">
            <Label htmlFor="file_name">
              File Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="file_name"
              value={form.file_name}
              onChange={(e) => set('file_name')(e.target.value)}
              placeholder="e.g. 20260926_BULLETIN_Govt_Policy"
              required
            />
          </div>

          {/* Row 2: Type + Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Task Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.task_type_id} onValueChange={set('task_type_id')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full inline-block"
                          style={{ background: tt.color_hex }}
                        />
                        {tt.code}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Assigned To <span className="text-destructive">*</span>
              </Label>
              <Select value={form.assigned_to} onValueChange={set('assigned_to')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}
                      {p.employee_code && (
                        <span className="text-muted-foreground ml-1">({p.employee_code})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={set('status')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done" disabled={!!taskCompletionError(form) || !currentProfile?.is_active || form.assigned_to !== currentProfile.id || (!!task && task.assigned_to !== currentProfile.id)}>Done</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={set('priority')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Channel + Marketing Ad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Channel / Page</Label>
              <Select value={form.channel_id} onValueChange={set('channel_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Marketing Ad</Label>
              <Select value={form.marketing_ad_id} onValueChange={set('marketing_ad_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select advertiser…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {marketingAds.map((ad) => (
                    <SelectItem key={ad.id} value={ad.id}>
                      {ad.advertiser} — {ad.package_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Remarks */}
          <div className="space-y-1.5">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={form.remarks}
              onChange={(e) => set('remarks')(e.target.value)}
              placeholder="Internal notes or production remarks…"
              rows={2}
            />
          </div>

          {/* Row 6: Caption */}
          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption</Label>
            <CaptionEditor value={form.caption} onChange={set('caption')} disabled={submitting} />
          </div>

          {/* Row 7: Links */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="youtube_link">YouTube Link</Label>
              <Input
                id="youtube_link"
                type="url"
                value={form.youtube_link}
                onChange={(e) => set('youtube_link')(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook_link">Facebook Link</Label>
              <Input
                id="facebook_link"
                type="url"
                value={form.facebook_link}
                onChange={(e) => set('facebook_link')(e.target.value)}
                placeholder="https://facebook.com/…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="google_drive_link">Google Drive Link</Label>
              <Input
                id="google_drive_link"
                type="url"
                value={form.google_drive_link}
                onChange={(e) => set('google_drive_link')(e.target.value)}
                placeholder="https://drive.google.com/…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
