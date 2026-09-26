import type { AppRole, TaskStatus, TaskPriority } from '@/types/enums'
import {
  APP_ROLE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/types/enums'

// ─── Label formatters ─────────────────────────────────────────────────────────

export function formatRole(role: AppRole): string {
  return APP_ROLE_LABELS[role] ?? role
}

export function formatStatus(status: TaskStatus): string {
  return TASK_STATUS_LABELS[status] ?? status
}

export function formatPriority(priority: TaskPriority): string {
  return TASK_PRIORITY_LABELS[priority] ?? priority
}

// ─── Name formatting ─────────────────────────────────────────────────────────

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ─── Number / percentage ──────────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function calcCompletionRate(done: number, total: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * 1000) / 10
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function shortenUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? '...' : '')
  } catch {
    return url
  }
}
