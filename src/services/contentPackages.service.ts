import { supabase } from '@/lib/supabase/client'

export type ContentStatus = 'draft' | 'submitted' | 'changes_requested' | 'approved'
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft', submitted: 'Awaiting approval', changes_requested: 'Changes requested', approved: 'Approved',
}
export interface ContentPackage {
  id: string
  package_name: string
  creator_id: string
  approver_id: string
  caption: string
  thumbnail_url: string
  status: ContentStatus
  feedback: string
  work_date: string | null
  time_slot: string | null
  task_type_id: string | null
  assigned_to: string | null
  task_id: string | null
  created_at: string
  updated_at: string
  creator?: { full_name: string } | null
  approver?: { full_name: string } | null
}
export interface ContentReview {
  id: string
  action: 'submitted' | 'feedback' | 'changes_requested' | 'approved'
  feedback: string
  created_at: string
  reviewer?: { full_name: string } | null
}
export type PackageValues = Pick<ContentPackage, 'package_name' | 'approver_id' | 'caption' | 'thumbnail_url'> & {
  creator_id?: string
}
export type ApprovalValues = Pick<ContentPackage, 'work_date' | 'time_slot' | 'task_type_id' | 'assigned_to'>

const SELECT = '*, creator:profiles!content_packages_creator_id_fkey(full_name), approver:profiles!content_packages_approver_id_fkey(full_name)'

export async function fetchContentPackages(): Promise<ContentPackage[]> {
  const { data, error } = await supabase.from('content_packages').select(SELECT).order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
export async function fetchContentReviews(packageId: string): Promise<ContentReview[]> {
  const { data, error } = await supabase.from('content_reviews').select('*, reviewer:profiles!content_reviews_reviewer_id_fkey(full_name)').eq('package_id', packageId).order('created_at')
  if (error) throw error
  return data ?? []
}
export async function saveContentPackage(values: PackageValues, defaultCreatorId: string, submit: boolean, entry?: ContentPackage) {
  const creatorId = values.creator_id || entry?.creator_id || defaultCreatorId
  const payload = {
    ...values,
    creator_id: creatorId,
    package_name: values.package_name.trim(),
    thumbnail_url: values.thumbnail_url.trim(),
    status: submit ? 'submitted' : entry?.status ?? 'draft',
  }
  const query = entry
    ? supabase.from('content_packages').update(payload).eq('id', entry.id).eq('status', entry.status).eq('updated_at', entry.updated_at)
    : supabase.from('content_packages').insert(payload)
  const { data, error } = await query.select(SELECT).single()
  if (error) throw error
  return data as ContentPackage
}
export async function reviewContentPackage(entry: ContentPackage, status: 'submitted' | 'changes_requested' | 'approved', feedback: string, approval?: ApprovalValues) {
  const { data, error } = await supabase.from('content_packages')
    .update({ status, feedback: feedback.trim(), ...(status === 'approved' ? approval : {}) })
    .eq('id', entry.id).eq('status', 'submitted').eq('updated_at', entry.updated_at).select(SELECT).single()
  if (error) throw error
  return data as ContentPackage
}
