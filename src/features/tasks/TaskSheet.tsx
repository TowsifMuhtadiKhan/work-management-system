import { taskCompletionError } from '@/utils/taskCompletion'
import { PlatformIcon } from './PlatformIcon'
import { createContext, useContext, useEffect, useId, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ChevronDown, History, Loader2, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchAssignableProfiles } from '@/services/profiles.service'
import { fetchTaskTypes } from '@/services/taskTypes.service'
import { fetchChannels } from '@/services/channels.service'
import { fetchMarketingAds } from '@/services/marketingAds.service'
import { createTask, updateTask, deleteTask, markTaskDone } from '@/services/tasks.service'
import { usePermissions } from '@/hooks/usePermissions'
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/enums'
import type { Task, Profile } from '@/types/entities'
import type { DbTaskInsert } from '@/types/database'
import { TaskHistoryDrawer } from './TaskHistoryDrawer'
import { TIME_SLOTS, slotLabel } from './timeSlots'
import { CaptionEditor } from './CaptionEditor'
import { ContentSourceIcon } from '@/components/common/ContentSourceIcon'

type Option = { id: string; label: string }
type Props = { tasks: Task[]; profile: Profile; workDate: string; mine: boolean }
const CellEditorContext = createContext<{
  host: HTMLDivElement | null;
  selected: string | null;
  select: (id: string) => void;
}>({ host: null, selected: null, select: () => {} })

export function TaskSheet({ tasks, profile, workDate, mine }: Props) {
  const [history, setHistory] = useState<Task | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editorHost, setEditorHost] = useState<HTMLDivElement | null>(null)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const permissions = usePermissions(profile)
  const people = useQuery({ queryKey: ['assignable-profiles'], queryFn: fetchAssignableProfiles })
  const types = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes })
  const channels = useQuery({ queryKey: ['channels'], queryFn: fetchChannels })
  const ads = useQuery({ queryKey: ['marketing-ads'], queryFn: fetchMarketingAds })
  const catalogs = {
    assigned_to: (people.data ?? []).map(p => ({ id: p.id, label: p.full_name })),
    task_type_id: (types.data ?? []).map(t => ({ id: t.id, label: t.name })),
    channel_id: (channels.data ?? []).map(c => ({ id: c.id, label: c.name })),
    marketing_ad_id: (ads.data ?? []).map(a => ({ id: a.id, label: a.advertiser })),
    status: Object.entries(TASK_STATUS_LABELS).map(([id, label]) => ({ id, label })),
    priority: Object.entries(TASK_PRIORITY_LABELS).map(([id, label]) => ({ id, label })),
  }
  return <CellEditorContext.Provider value={{ host: editorHost, selected: selectedCell, select: setSelectedCell }}><div className="task-sheet p-2 sm:p-4 space-y-4">
    <div data-cell-editor className="cell-editor-panel relative w-full max-h-[40vh] overflow-y-auto rounded-lg border border-indigo-200 bg-background p-3 shadow-sm dark:border-indigo-800">
      {selectedCell && <Button variant="ghost" size="sm" className="mb-2" onClick={() => setSelectedCell(null)}>Close expanded editor</Button>}
      <div ref={setEditorHost} className="empty:hidden" />
    </div>
    {[people, types, channels, ads].some(q => q.isError) && <p role="alert" className="text-destructive">Some dropdown options could not load. Refresh to try again.</p>}
    {['', ...TIME_SLOTS].map(slot => {
      const rows = tasks.filter(t => (t.time_slot ?? '') === slot)
      const isCollapsed = collapsed[slot] ?? false
      const contentId = `task-section-${mine ? 'mine' : 'daily'}-${slot || 'unscheduled'}`
      const canCreate = permissions.canCreateTask()
      if (!slot && !rows.length) return null
      const hue = (38 + TIME_SLOTS.indexOf(slot) * 137.5) % 360
      const sectionStyle = slot ? {
        '--section-color': `hsl(${hue} 70% 28%)`,
        '--section-tint': `hsl(${hue} 85% 92%)`,
      } as CSSProperties : undefined
      return <section key={slot} aria-label={slotLabel(slot)} style={sectionStyle} className="sheet-section rounded-xl border overflow-hidden shadow-sm">
        <div className="sheet-section-heading flex items-center justify-between gap-3 px-4 py-3 border-b">
          <h2 className="flex-1 font-semibold text-sm"><button type="button" aria-expanded={!isCollapsed} aria-controls={contentId} onClick={() => setCollapsed(previous => ({ ...previous, [slot]: !isCollapsed }))} className="flex w-full items-center gap-2 rounded text-left py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">
            <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            {slotLabel(slot)} <span className="text-muted-foreground font-normal ml-2">{rows.length} tasks</span>
          </button></h2>
        </div>
        <div id={contentId} hidden={isCollapsed}>
        {(rows.length || canCreate) ? <div className="overflow-x-auto"><table className="responsive-sheet w-full text-xs">
          <thead className="sheet-columns"><tr><th scope="col" className="w-10 px-1"><span className="sr-only">Source</span></th>{['File name', 'Type', 'Assigned person', 'Status', 'Channel / Page', 'Marketing ad', 'Remarks', 'Caption', 'YouTube link', 'Facebook link', 'Priority', 'Actions'].map(label => <th key={label} className={`text-left px-2 py-1.5 whitespace-nowrap font-extrabold ${label === 'Actions' ? 'sheet-actions' : ''}`}><span className="inline-flex items-center gap-1.5">{(label === 'YouTube link' || label === 'Facebook link') && <PlatformIcon platform={label} />}{label}</span></th>)}</tr></thead>
          <tbody>{rows.map(task => <SheetRow key={task.id} task={task} slot={slot} profile={profile} workDate={workDate} mine={mine} catalogs={catalogs} editable={permissions.canEditTask(task.assigned_to, task.assigned_profile)} onHistory={() => setHistory(task)} />)}
            {canCreate && <DraftRows key={`${workDate}-${mine}-${profile.id}`} slot={slot} profile={profile} workDate={workDate} mine={mine} catalogs={catalogs} editable />}
          </tbody>
        </table></div> : <p className="px-4 py-3 text-xs text-muted-foreground">No tasks in this section.</p>}
        </div>
      </section>
    })}
    {history && <TaskHistoryDrawer task={history} open onClose={() => setHistory(null)} />}
  </div></CellEditorContext.Provider>
}

type RowProps = {
  task?: Task; slot: string; profile: Profile; workDate: string; mine: boolean;
  catalogs: Record<string, Option[]>; editable: boolean; onRemove?: () => void; onHistory?: () => void; onStartEditing?: () => void;
}

function DraftRows(props: RowProps) {
  const [ids, setIds] = useState(() => [crypto.randomUUID()])
  return <>{ids.map(id => <SheetRow key={id} {...props}
    onStartEditing={() => {
      const nextId = crypto.randomUUID()
      setIds(current => current.at(-1) === id ? [...current, nextId] : current)
    }}
    onRemove={() => {
      const nextId = crypto.randomUUID()
      setIds(current => {
        const remaining = current.filter(rowId => rowId !== id)
        return current.at(-1) === id ? [...remaining, nextId] : remaining
      })
    }}
  />)}</>
}

function SheetRow({ task, slot, profile, workDate, mine, catalogs, editable, onRemove, onHistory, onStartEditing }: RowProps) {
  const cellEditor = useContext(CellEditorContext)
  const rowId = useId()
  const [focusedField, setFocusedField] = useState<string>('file_name')
  const queryClient = useQueryClient()
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const handleChange = (field: string, value: string) => {
    setChanges(v => ({ ...v, [field]: value }))
    if (value.trim()) onStartEditing?.()
  }
  const defaults: DbTaskInsert = { work_date: workDate, time_slot: slot || null, file_name: '', task_type_id: '', assigned_to: mine ? profile.id : '', status: 'pending', priority: 'normal', channel_id: null, marketing_ad_id: null, remarks: null, caption: null, youtube_link: null, facebook_link: null, google_drive_link: null, created_by: profile.id }
  const form = { ...defaults, ...task, ...changes }
  const dirty = Object.keys(changes).length > 0
  const completionError = taskCompletionError(form)
  const canComplete = profile.is_active && (task?.assigned_to ?? form.assigned_to) === profile.id && form.assigned_to === profile.id
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const refresh = async () => {
    await Promise.all(['tasks', 'daily-stats', 'tasks-by-employee', 'marketing-progress', 'task-history'].map(key => queryClient.invalidateQueries({ queryKey: [key] })))
  }
  const save = async () => {
    if (!form.file_name.trim() || !form.task_type_id || !form.assigned_to) { setError('Enter file name, type, and assigned person.'); return }
    if (form.status === 'done' && completionError) { setError(completionError); return }
    for (const key of ['youtube_link', 'facebook_link', 'google_drive_link'] as const) {
      const value = form[key]?.trim()
      if (value) { try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error() } catch { setError('Links must be valid http or https URLs.'); return } }
    }
    setSaving(true); setError('')
    try {
      // Send only edited fields on updates so untouched cells keep remote changes.
      const payload = Object.fromEntries(Object.entries(task ? changes : { ...defaults, ...changes }).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]))
      if (task) await updateTask(task.id, { ...payload, updated_by: profile.id })
      else await createTask(payload as DbTaskInsert)
      await refresh(); setChanges({}); onRemove?.(); toast.success('Row saved')
    } catch (e) {
      const message = e && typeof e === 'object' && 'message' in e ? String(e.message) : 'Unable to save row'
      setError(/time_slot/.test(message) ? 'Apply the task_work_time SQL update in Supabase, then retry. Your row has been kept.' : message)
    } finally { setSaving(false) }
  }
  const fields = ['file_name', 'task_type_id', 'assigned_to', 'status', 'channel_id', 'marketing_ad_id', 'remarks', 'caption', 'youtube_link', 'facebook_link', 'priority'] as const
  return <tr data-status={form.status} data-dirty={dirty} className="sheet-row border-b align-top">
    <td data-label="Source" className="p-1.5"><ContentSourceIcon packageId={task?.source_content_id} /></td>
    {fields.map(field => {
      const value = String(form[field] ?? '')
      const options = catalogs[field]
      const disabled = !editable || saving || (mine && field === 'assigned_to')
      return <td key={field} data-label={field.replaceAll('_', ' ')} className="p-1.5">
        {field === 'caption' ? <CaptionEditor value={value} disabled={disabled} onChange={caption => handleChange("caption", caption)} /> : options ? <select data-field={field} data-value={value} aria-label={field.replaceAll('_', ' ')} className={`sheet-select h-9 ${field === 'status' ? 'w-[120px] min-w-[120px] max-w-[120px]' : field === 'priority' ? 'w-24 min-w-24 max-w-24' : 'min-w-36 max-w-52'} rounded-md border px-2 font-medium disabled:opacity-60`} value={value} disabled={disabled} onChange={e => handleChange(field, e.target.value)}>
          <option value="">Select…</option>
          {value && !options.some(o => o.id === value) && <option value={value}>{field === 'assigned_to' ? task?.assigned_profile?.full_name ?? profile.full_name : field === 'task_type_id' ? task?.task_type?.name ?? value : field === 'channel_id' ? task?.channel?.name ?? value : task?.marketing_ad?.advertiser ?? value}</option>}
          {options.map(o => <option key={o.id} value={o.id} disabled={field === 'status' && o.id === 'done' && (!canComplete || !!completionError)}>{o.label}</option>)}
        </select> : <>
          <Input data-cell-editor={disabled ? undefined : true} aria-label={field.replaceAll('_', ' ')} title={value} className={`${field === 'file_name' ? 'min-w-64' : 'min-w-48'} text-xs ${cellEditor.selected === rowId && focusedField === field ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : ''}`} value={value} readOnly={disabled} onFocus={() => { if (!disabled) { setFocusedField(field); cellEditor.select(rowId) } }} onChange={e => handleChange(field, e.target.value)} />
          {cellEditor.host && cellEditor.selected === rowId && focusedField === field && createPortal(<div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><label htmlFor={`${rowId}-full-cell`} className="font-semibold text-indigo-700 dark:text-indigo-300">{field.replaceAll('_', ' ')} · {slotLabel(slot)}</label><span className="text-muted-foreground">{disabled ? 'Read only' : 'Changes apply to this row. Click Save when finished.'}</span></div>
            <textarea id={`${rowId}-full-cell`} aria-label={`Full ${field.replaceAll('_', ' ')}`} value={value} readOnly={disabled} rows={3} className="w-full resize-y rounded-md border bg-background p-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" style={{ overflowWrap: 'anywhere' }} onChange={e => handleChange(field, e.target.value.replace(/[\r\n]+/g, field === 'remarks' ? '\n' : ' '))} />
          </div>, cellEditor.host)}
        </>}
      </td>
    })}
    <td data-label="Actions" className="sheet-actions p-2"><div className="flex w-[108px] flex-wrap items-center gap-1 [&>*]:shrink-0">
      {task && canComplete && task.status !== 'done' && <Button size="icon" aria-label="Mark as done" className="h-8 w-8 bg-emerald-700 hover:bg-emerald-800 text-white" disabled={saving || dirty || !!completionError} title={completionError ?? (dirty ? 'Save or cancel row edits before marking done' : 'Complete your assigned task')} onClick={async () => {
        setSaving(true); setError('')
        try { await markTaskDone(task.id, profile.id); await refresh(); toast.success('Task marked as done') }
        catch { setError('Unable to mark done. The task may have been reassigned. Refresh and try again.') }
        finally { setSaving(false) }
      }}><Check className="h-4 w-4" aria-hidden="true" /></Button>}
      {task?.status === 'done' && <span role="img" aria-label="Done" title="Done" className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-700 text-white"><Check className="h-4 w-4" aria-hidden="true" /></span>}
      {editable && (dirty || !task) && <Button className="h-6 w-6 bg-emerald-700 hover:bg-emerald-800 text-white" size="icon" aria-label="Save" title="Save changes" disabled={saving || !dirty} onClick={() => void save()}>{saving ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Save className="h-3 w-3" aria-hidden="true" />}</Button>}
      {(dirty || !task) && <Button size="icon" className="h-6 w-6 text-muted-foreground" aria-label="Cancel" title="Discard changes" variant="ghost" disabled={saving || !dirty} onClick={() => { setChanges({}); setError(''); onRemove?.() }}><X className="h-3 w-3" aria-hidden="true" /></Button>}
      {task && <Button size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 dark:text-indigo-300" variant="ghost" title="History" aria-label="History" onClick={onHistory}><History className="h-4 w-4" aria-hidden="true" /></Button>}
      {task && !task.source_content_id && profile.application_role === 'administrator' && <Button size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40" variant="ghost" title="Delete" aria-label="Delete" disabled={saving} onClick={async () => {
        if (!window.confirm(`Delete "${task.file_name}"?`)) return
        setSaving(true)
        try { await deleteTask(task.id); await refresh() } catch { setError('Unable to delete row') } finally { setSaving(false) }
      }}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>}
    </div>{dirty && <p className="text-amber-700 dark:text-amber-300 text-[10px] font-semibold mt-1">Unsaved changes</p>}{error && <p role="alert" className="text-destructive text-xs mt-2 max-w-64">{error}</p>}</td>
  </tr>
}
