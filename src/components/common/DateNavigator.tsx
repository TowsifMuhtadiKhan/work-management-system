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
    <div className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 sm:flex sm:w-auto">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onDateChange(addDays(date, -1))}
        title="Previous day"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="relative flex min-h-11 sm:min-h-9 items-center gap-2 min-w-0 sm:min-w-[200px] justify-center rounded-md border border-indigo-200 bg-background px-2 sm:px-3 text-indigo-800 hover:bg-indigo-50 focus-within:ring-2 focus-within:ring-indigo-500 dark:border-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-950/40">
        <CalendarDays aria-hidden="true" className="hidden sm:block h-4 w-4 shrink-0" />
        <span aria-hidden="true" className="font-semibold text-xs sm:text-sm text-center">{formatDate(date)}</span>
        <input
          type="date"
          aria-label="Choose work date"
          title="Choose a specific date"
          value={date}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onClick={event => {
            // Supported browsers open their native calendar; others retain the date input.
            try { event.currentTarget.showPicker?.() } catch { event.currentTarget.focus() }
          }}
          onChange={event => {
            const next = event.target.value
            if (/^\d{4}-\d{2}-\d{2}$/.test(next) && event.target.validity.valid) onDateChange(next)
          }}
        />
      </div>

      {!isToday && (
        <Button
          variant="secondary"
          size="sm"
          className="order-4 col-span-3 sm:order-none"
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
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
