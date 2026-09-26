// ─────────────────────────────────────────────────────────────────────────────
// Application Enums — mirroring PostgreSQL enum types
// ─────────────────────────────────────────────────────────────────────────────

export type AppRole = 'administrator' | 'manager' | 'team_lead' | 'employee'

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'done'
  | 'hold'
  | 'cancelled'

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  done: 'Done',
  hold: 'Hold',
  cancelled: 'Cancelled',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
}

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  administrator: 'Administrator',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
}

// Role hierarchy level (higher = more authority)
export const ROLE_LEVEL: Record<AppRole, number> = {
  employee: 1,
  team_lead: 2,
  manager: 3,
  administrator: 4,
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  hold: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  normal: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}
