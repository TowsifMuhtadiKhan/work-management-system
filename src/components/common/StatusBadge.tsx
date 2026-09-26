import { cn } from '@/utils/cn'
import type { TaskStatus } from '@/types/enums'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/types/enums'

interface StatusBadgeProps {
  status: TaskStatus
  className?: string
  size?: 'sm' | 'default'
}

export function StatusBadge({ status, className, size = 'default' }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        TASK_STATUS_COLORS[status],
        className
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  )
}
