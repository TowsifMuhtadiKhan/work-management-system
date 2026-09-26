import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

// ─── Format a date string (YYYY-MM-DD or ISO) for display ────────────────────

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMMM d, yyyy')
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy h:mm a')
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'h:mm a')
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDateLabel(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return `Today — ${format(d, 'MMMM d, yyyy')}`
  if (isYesterday(d)) return `Yesterday — ${format(d, 'MMMM d, yyyy')}`
  return format(d, 'EEEE, MMMM d, yyyy')
}

// ─── Date navigation helpers ─────────────────────────────────────────────────

export function addDays(dateStr: string, days: number): string {
  const d = parseISO(dateStr)
  d.setDate(d.getDate() + days)
  return formatDateISO(d)
}

export function todayISO(): string {
  return formatDateISO(new Date())
}

export function isTodayStr(dateStr: string): boolean {
  return isToday(parseISO(dateStr))
}
