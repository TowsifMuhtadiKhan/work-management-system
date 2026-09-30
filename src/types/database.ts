import type { WorkSection } from './workSection'
// ─────────────────────────────────────────────────────────────────────────────
// Raw Supabase database types — aligned with 001_schema.sql
// These types map 1:1 with the PostgREST API response shapes.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppRole, TaskStatus, TaskPriority } from './enums'

// ─── Table Row types ──────────────────────────────────────────────────────────

export interface DbDepartment {
  id: string
  name: string
  code: string
  is_active: boolean
  allowed_features?: string[] | null
  created_at: string
  updated_at: string
}

export interface DbProfile {
  id: string
  full_name: string
  email: string
  employee_code: string | null
  designation: string | null
  department_id: string | null
  manager_id: string | null
  application_role: AppRole
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface DbTaskType {
  id: string
  name: string
  code: string
  color_hex: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface DbChannel {
  id: string
  name: string
  platform: string
  color_hex?: string | null
  is_active: boolean
  created_at: string
}

export interface DbMarketingAd {
  work_section?: WorkSection
  id: string
  advertiser: string
  package_type: string
  daily_target: number
  description: string | null
  is_active: boolean
  valid_from: string | null
  valid_to: string | null
  created_at: string
  updated_at: string
}

export interface DbTask {
  work_section?: WorkSection
  source_content_id?: string | null
  time_slot?: string | null
  id: string
  work_date: string
  file_name: string
  task_type_id: string
  assigned_to: string
  status: TaskStatus
  channel_id: string | null
  marketing_ad_id: string | null
  remarks: string | null
  caption: string | null
  youtube_link: string | null
  facebook_link: string | null
  google_drive_link: string | null
  priority: TaskPriority
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface DbTaskHistory {
  id: string
  task_id: string
  changed_by: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_at: string
}

// ─── Insert types (omit auto-generated fields) ────────────────────────────────

export type DbTaskInsert = Omit<
  DbTask,
  'id' | 'created_at' | 'updated_at' | 'updated_by'
> & { updated_by?: string | null }

export type DbTaskUpdate = Partial<
  Omit<DbTask, 'id' | 'created_at' | 'created_by'>
> & { updated_by: string }

export type DbProfileInsert = Omit<DbProfile, 'created_at' | 'updated_at'>
export type DbProfileUpdate = Partial<Omit<DbProfile, 'id' | 'created_at'>>

export type DbDepartmentInsert = Omit<DbDepartment, 'id' | 'created_at' | 'updated_at'>
export type DbTaskTypeInsert = Omit<DbTaskType, 'id' | 'created_at'>
export type DbChannelInsert = Omit<DbChannel, 'id' | 'created_at'>
export type DbMarketingAdInsert = Omit<DbMarketingAd, 'id' | 'created_at' | 'updated_at'>
