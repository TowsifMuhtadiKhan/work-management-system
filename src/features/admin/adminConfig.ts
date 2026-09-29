export type Catalog = 'departments' | 'task_types' | 'channels' | 'marketing_ads'
export type AdminRow = Record<string, string | number | boolean | null> & { id: string; is_active: boolean }
export interface Field {
  key: string
  label: string
  type?: 'text' | 'number' | 'date' | 'color' | 'textarea'
  required?: boolean
}
export interface CatalogConfig {
  title: string
  singular: string
  description: string
  sort: string
  fields: Field[]
}
export const catalogConfig: Record<Catalog, CatalogConfig> = {
  departments: {
    title: 'Departments', singular: 'Department', sort: 'name',
    description: 'Organize employees into departments. Deactivated departments remain in historical records.',
    fields: [{ key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code', required: true }],
  },
  task_types: {
    title: 'Task Types', singular: 'Task Type', sort: 'sort_order',
    description: 'Define the types of work available when creating an assignment.',
    fields: [{ key: 'name', label: 'Name', required: true }, { key: 'code', label: 'Code', required: true },
      { key: 'color_hex', label: 'Color', type: 'color', required: true }, { key: 'sort_order', label: 'Display order', type: 'number', required: true }],
  },
  channels: {
    title: 'Channels', singular: 'Channel', sort: 'name',
    description: 'Manage publishing destinations such as YouTube, Facebook, and television.',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'platform', label: 'Platform', required: true },
    ],
  },
  marketing_ads: {
    title: 'Marketing Ads', singular: 'Marketing Ad', sort: 'advertiser',
    description: 'Manage advertisers, packages, daily targets, and campaign dates for assignments.',
    fields: [{ key: 'advertiser', label: 'Advertiser', required: true }, { key: 'package_type', label: 'Package type', required: true },
      { key: 'daily_target', label: 'Daily target', type: 'number', required: true },
      { key: 'valid_from', label: 'Valid from', type: 'date' }, { key: 'valid_to', label: 'Valid to', type: 'date' },
      { key: 'description', label: 'Description', type: 'textarea' }],
  },
}

export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return 'Unable to save. Please try again.'
}

export function catalogPayload(catalog: Catalog, values: Record<string, string>, active: boolean) {
  const payload: Record<string, string | number | boolean | null> = { is_active: active }
  for (const field of catalogConfig[catalog].fields) {
    const value = (values[field.key] ?? '').trim()
    if (field.required && !value) throw new Error(`${field.label} is required.`)
    if (field.type === 'number') {
      const number = Number(value)
      if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${field.label} must be a non-negative whole number.`)
      payload[field.key] = number
    } else {
      payload[field.key] = value || null
    }
  }
  if (values.valid_from && values.valid_to && values.valid_from > values.valid_to) {
    throw new Error('The end date must be on or after the start date.')
  }
  return payload
}
