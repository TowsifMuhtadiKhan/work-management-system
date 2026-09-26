import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateISO, addDays, isTodayStr } from '@/utils/date'

interface DateNavigatorProps {
  date: string // ISO YYYY-MM-DD
  onDateChange: (date: string) => void
}

export function DateNavigator({ date, onDateChange }: DateNavigatorProps) {
  const isToday = isTodayStr(date)

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onDateChange(addDays(date, -1))}
        title="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[200px] justify-center">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{formatDate(date)}</span>
      </div>

      {!isToday && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDateChange(formatDateISO(new Date()))}
        >
          Today
        </Button>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onDateChange(addDays(date, 1))}
        title="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
