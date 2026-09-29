import * as XLSX from 'xlsx'
import type { Task } from '@/types/entities'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/enums'
import { formatDate } from '@/utils/date'
import { slotLabel } from '@/features/tasks/timeSlots'
import { captionText } from '@/utils/caption'

/**
 * Export tasks to an Excel (.xlsx) file matching the original Desh TV Excel format.
 */
export function exportTasksToExcel(tasks: Task[], workDate: string): void {
  const rows = tasks.map((task, index) => ({
    '#': index + 1,
    'Time Section': slotLabel(task.time_slot ?? ''),
    'File Name': task.file_name,
    'Type': task.task_type?.code ?? '',
    'Assigned Person': task.assigned_profile?.full_name ?? '',
    'Status': TASK_STATUS_LABELS[task.status],
    'Priority': TASK_PRIORITY_LABELS[task.priority],
    'Channel / Page': task.channel?.name ?? '',
    'Marketing Ad': task.marketing_ad?.advertiser ?? '',
    'Package Type': task.marketing_ad?.package_type ?? '',
    'Remarks': task.remarks ?? '',
    'Caption': captionText(task.caption),
    'YouTube Link': task.youtube_link ?? '',
    'Facebook Link': task.facebook_link ?? '',
    'Google Drive': task.google_drive_link ?? '',
    'Last Updated': task.updated_at
      ? new Date(task.updated_at).toLocaleString()
      : new Date(task.created_at).toLocaleString(),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-fit column widths
  const colWidths = [
    { wch: 4 },   // #
    { wch: 16 },  // Time section
    { wch: 30 },  // File Name
    { wch: 12 },  // Type
    { wch: 20 },  // Assigned Person
    { wch: 12 },  // Status
    { wch: 10 },  // Priority
    { wch: 20 },  // Channel
    { wch: 18 },  // Marketing Ad
    { wch: 20 },  // Package Type
    { wch: 30 },  // Remarks
    { wch: 30 },  // Caption
    { wch: 35 },  // YouTube Link
    { wch: 35 },  // Facebook Link
    { wch: 35 },  // Google Drive
    { wch: 20 },  // Last Updated
  ]
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Tasks')

  const fileName = `DeshTV_Tasks_${workDate}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

/**
 * Export tasks to a CSV file.
 */
export function exportTasksToCSV(tasks: Task[], workDate: string): void {
  const headers = [
    'Time Section', 'File Name', 'Type', 'Assigned Person', 'Status', 'Priority',
    'Channel / Page', 'Marketing Ad', 'Remarks', 'Caption',
    'YouTube Link', 'Facebook Link', 'Google Drive', 'Last Updated',
  ]

  const rows = tasks.map((task) => [
    slotLabel(task.time_slot ?? ''),
    task.file_name,
    task.task_type?.code ?? '',
    task.assigned_profile?.full_name ?? '',
    TASK_STATUS_LABELS[task.status],
    TASK_PRIORITY_LABELS[task.priority],
    task.channel?.name ?? '',
    task.marketing_ad?.advertiser ?? '',
    task.remarks ?? '',
    captionText(task.caption),
    task.youtube_link ?? '',
    task.facebook_link ?? '',
    task.google_drive_link ?? '',
    task.updated_at
      ? new Date(task.updated_at).toLocaleString()
      : new Date(task.created_at).toLocaleString(),
  ])

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `DeshTV_Tasks_${workDate}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Export campaign-specific tasks to an Excel (.xlsx) file including Caption, Facebook Link, and YouTube Link.
 */
export function exportMarketingReportToExcel(
  advertiser: string,
  packageType: string,
  startDate: string,
  endDate: string,
  tasks: Task[]
): void {
  const rows = tasks.map((task) => ({
    'Date': task.work_date,
    'Caption': captionText(task.caption),
    'Facebook Link': task.facebook_link ?? '',
    'YouTube Link': task.youtube_link ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  const colWidths = [
    { wch: 14 },  // Date
    { wch: 50 },  // Caption
    { wch: 40 },  // Facebook Link
    { wch: 40 },  // YouTube Link
  ]
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign Tasks')

  const safeAdvertiser = advertiser.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_')
  const fileName = `DeshTV_Marketing_${safeAdvertiser}_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

