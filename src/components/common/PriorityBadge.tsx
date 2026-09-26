import { cn } from '@/utils/cn'
import type { TaskPriority } from '@/types/enums'
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/types/enums'

interface PriorityBadgeProps {
  priority: TaskPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        TASK_PRIORITY_COLORS[priority],
        className
      )}
    >
      {TASK_PRIORITY_LABELS[priority]}
    </span>
  )
}
