import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { fetchAllProfiles } from '@/services/profiles.service'
import { fetchTaskTypes } from '@/services/taskTypes.service'
import { fetchChannels } from '@/services/channels.service'
import { fetchDepartments } from '@/services/departments.service'
import { fetchMarketingAds } from '@/services/marketingAds.service'
import type { TaskFilters } from '@/types/entities'

interface TaskFiltersPanelProps {
  hideAssignee?: boolean
  filters: Omit<TaskFilters, 'workDate' | 'search'>
  onChange: (filters: Omit<TaskFilters, 'workDate' | 'search'>) => void
  onClose: () => void
}

export function TaskFiltersPanel({ filters, onChange, onClose, hideAssignee = false }: TaskFiltersPanelProps) {
  const { data: profiles = [] } = useQuery({ queryKey: ['all-profiles'], queryFn: fetchAllProfiles })
  const { data: taskTypes = [] } = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })
  const { data: channels = [] } = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments })
  const { data: marketingAds = [] } = useQuery({ queryKey: ['marketing-ads'], queryFn: fetchMarketingAds })

  const set = (field: keyof typeof filters) => (value: string) =>
    onChange({ ...filters, [field]: value === '__all' ? undefined : value })

  const clearAll = () => onChange({})
  const activeCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="border-b bg-muted/30 px-6 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Employee */}
        {!hideAssignee && <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Employee
          </Label>
          <Select value={filters.assignedTo ?? '__all'} onValueChange={set('assignedTo')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All employees</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>}

        {/* Status */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Status
          </Label>
          <Select value={filters.status ?? '__all'} onValueChange={set('status')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="hold">Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task Type */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Type
          </Label>
          <Select value={filters.taskTypeId ?? '__all'} onValueChange={set('taskTypeId')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All types</SelectItem>
              {taskTypes.map((tt) => (
                <SelectItem key={tt.id} value={tt.id}>
                  {tt.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Channel */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Channel
          </Label>
          <Select value={filters.channelId ?? '__all'} onValueChange={set('channelId')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All channels</SelectItem>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Department
          </Label>
          <Select value={filters.departmentId ?? '__all'} onValueChange={set('departmentId')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Marketing Ad */}
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Marketing
          </Label>
          <Select value={filters.marketingAdId ?? '__all'} onValueChange={set('marketingAdId')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All advertisers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All advertisers</SelectItem>
              {marketingAds.map((ad) => (
                <SelectItem key={ad.id} value={ad.id}>
                  {ad.advertiser}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
