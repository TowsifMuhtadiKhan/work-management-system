import type { WorkSection } from './workSection'
// ─────────────────────────────────────────────────────────────────────────────
// Application-level entities — enriched joins used in the UI
// ─────────────────────────────────────────────────────────────────────────────

import type {
  DbDepartment,
  DbProfile,
  DbTaskType,
  DbChannel,
  DbMarketingAd,
  DbTask,
  DbTaskHistory,
} from './database'

// Re-export database types as canonical entity types (these are the same shape)
export type Department = DbDepartment
export type TaskType = DbTaskType
export type Channel = DbChannel
export type MarketingAd = DbMarketingAd

// Profile with resolved department join (used in selects/tables)
export interface Profile extends DbProfile {
  department?: Department | null
  manager?: Pick<DbProfile, 'id' | 'full_name' | 'email' | 'designation'> | null
}

// Task enriched with all foreign-key joins resolved
export interface Task extends DbTask {
  task_type?: TaskType | null
  channel?: Channel | null
  marketing_ad?: MarketingAd | null
  assigned_profile?: Pick<
    DbProfile,
    'id' | 'full_name' | 'email' | 'employee_code' | 'designation' | 'avatar_url' | 'manager_id' | 'application_role' | 'department_id'
  > | null
  created_by_profile?: Pick<DbProfile, 'id' | 'full_name' | 'department_id'> | null
  updated_by_profile?: Pick<DbProfile, 'id' | 'full_name'> | null
}

// Task history entry with the changer's profile
export interface TaskHistoryEntry extends DbTaskHistory {
  changed_by_profile?: Pick<DbProfile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ─── Department Feature Definitions ──────────────────────────────────────────

export const DEPARTMENT_FEATURES = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', description: 'Overview and productivity stats' },
  { id: 'my_tasks', label: 'My Task', href: '/my-tasks', description: 'Personal task assignments' },
  { id: 'daily_tasks', label: 'Daily Task', href: '/tasks', description: 'Department daily task schedule' },
  { id: 'rush', label: 'Rush', href: '/rush', description: 'Rush items and breaking news tracker' },
  { id: 'content_creator', label: 'Content Creator', href: '/content-creator', description: 'Package submissions & reviews' },
  { id: 'reports', label: 'Reports', href: '/reports', description: 'Performance and production reports' },
  { id: 'marketing', label: 'Marketing', href: '/marketing', description: 'Commercial campaigns & target delivery' },
] as const

export type DepartmentFeatureId = typeof DEPARTMENT_FEATURES[number]['id']

export const DEFAULT_DEPARTMENT_FEATURES: DepartmentFeatureId[] = [
  'dashboard',
  'my_tasks',
  'daily_tasks',
  'rush',
  'content_creator',
  'reports',
  'marketing',
]

// ─── Filter/Query types ───────────────────────────────────────────────────────

export interface TaskFilters {
  workSection?: WorkSection
  workDate?: string
  assignedTo?: string
  status?: string
  taskTypeId?: string
  channelId?: string
  departmentId?: string
  marketingAdId?: string
  search?: string
  priority?: string
}

// ─── Dashboard/Report aggregate types ────────────────────────────────────────

export interface DailyStats {
  total: number
  done: number
  in_progress: number
  pending: number
  assigned: number
  hold: number
  cancelled: number
  completion_rate: number
}

export interface EmployeeTaskSummary {
  profile: Pick<DbProfile, 'id' | 'full_name' | 'employee_code' | 'avatar_url'>
  total: number
  done: number
  in_progress: number
  pending: number
}

export interface MarketingAdProgress {
  ad: MarketingAd
  completed: number
  daily_target: number
  remaining: number
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface TaskFormValues {
  work_date: string
  file_name: string
  task_type_id: string
  assigned_to: string
  status: string
  channel_id: string
  marketing_ad_id: string
  remarks: string
  caption: string
  youtube_link: string
  facebook_link: string
  google_drive_link: string
  priority: string
}

export interface ProfileFormValues {
  full_name: string
  email: string
  employee_code: string
  designation: string
  department_id: string
  manager_id: string
  application_role: string
  is_active: boolean
}
