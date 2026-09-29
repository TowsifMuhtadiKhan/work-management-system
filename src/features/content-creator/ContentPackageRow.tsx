import { useContext, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DraftRowActions } from '@/components/common/SheetDraftRows'
import { CONTENT_STATUS_LABELS, saveContentPackage, type ContentPackage, type ContentStatus, type PackageValues } from '@/services/contentPackages.service'
import { ContentCellEditorContext } from './ContentCreatorPage'
import { cn } from '@/utils/cn'

interface Props extends Partial<DraftRowActions> {
  entry?: ContentPackage
  userId: string
  canManage?: boolean
  people: { id: string; full_name: string }[]
  unavailable: boolean
  hidden?: boolean
  onDetails?: (action?: ContentStatus) => void
}

export function ContentPackageRow({ entry, userId, canManage, people, unavailable, hidden, onDetails, onStartEditing, onRemove }: Props) {
  const cellEditor = useContext(ContentCellEditorContext)
  const rowId = useId()
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const client = useQueryClient()
  const [changes, setChanges] = useState<Partial<PackageValues>>({})
  const [base, setBase] = useState<ContentPackage>()
  const [error, setError] = useState('')
  const [statusChange, setStatusChange] = useState<ContentStatus>()
  const original = base ?? entry
  const values: PackageValues = {
    package_name: original?.package_name ?? '',
    creator_id: original?.creator_id ?? userId,
    script: original?.script ?? '',
    approver_id: original?.approver_id ?? '',
    caption: original?.caption ?? '',
    thumbnail_url: original?.thumbnail_url ?? '',
    ...changes,
  }
  const dirty = Object.keys(changes).length > 0 || statusChange !== undefined
  const status = statusChange ?? entry?.status ?? 'draft'
  const canReview = entry?.approver_id === userId && entry.status === 'submitted'
  const editable = !entry || ((entry.creator_id === userId || canManage) && ['draft', 'changes_requested'].includes(entry.status))
  const change = (field: keyof PackageValues, value: string) => {
    setBase(current => current ?? entry)
    setChanges(current => ({ ...current, [field]: value }))
    if (value.trim()) onStartEditing?.()
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const mutation = useMutation({
    mutationFn: (submit: boolean) => saveContentPackage(values, userId, submit, original),
    onSuccess: (saved, submitted) => {
      client.setQueryData<ContentPackage[]>(['content-packages', userId], current => entry ? (current ?? []).map(row => row.id === saved.id ? saved : row) : [...(current ?? []), saved])
      setChanges({}); setBase(undefined); setStatusChange(undefined); setError(''); onRemove?.()
      toast.success(submitted ? 'Sent for approval' : 'Draft saved')
      void client.invalidateQueries({ queryKey: ['content-packages'] })
      void client.invalidateQueries({ queryKey: ['content-reviews'] })
    },
    onError: () => setError('Unable to save. Your row has been kept. Refresh and retry if the package changed.'),
  })
  const save = (submit: boolean) => {
    setError('')
    if (!values.package_name.trim() || !values.approver_id) { setError('Enter a package name and select an approver.'); return }
    if ((values.creator_id || userId) === values.approver_id) { setError('Creator and approver must be different people.'); return }
    if (values.thumbnail_url.trim()) {
      try { if (!['http:', 'https:'].includes(new URL(values.thumbnail_url.trim()).protocol)) throw new Error() }
      catch { setError('Enter a valid http or https thumbnail URL.'); return }
    }
    if (!mutation.isPending) mutation.mutate(submit)
  }
  const disabled = mutation.isPending || !editable
  return <tr hidden={hidden} className="align-top border-b">
    <td data-label="PKG name" className="border p-1.5">
      <Input
        data-cell-editor={editable ? true : undefined}
        aria-label="PKG name"
        maxLength={300}
        value={values.package_name}
        readOnly={!editable}
        disabled={mutation.isPending}
        className={cn(cellEditor.selected === rowId && focusedField === 'package_name' && 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30')}
        onFocus={() => {
          setFocusedField('package_name')
          cellEditor.select(rowId)
        }}
        onChange={event => change('package_name', event.target.value)}
      />
    </td>
    <td data-label="Creator name" className="border p-1.5">
      {editable ? (
        <select
          aria-label="Creator name"
          className="w-full rounded-md border bg-background px-2 py-2 text-xs"
          value={values.creator_id || userId}
          disabled={disabled}
          onChange={event => change('creator_id', event.target.value)}
        >
          <option value="">Select creator</option>
          {people.map(person => (
            <option key={person.id} value={person.id} disabled={person.id === values.approver_id}>
              {person.full_name}
            </option>
          ))}
        </select>
      ) : (
        <p className="px-1 py-2 text-sm">{entry?.creator?.full_name ?? people.find(person => person.id === (entry?.creator_id ?? userId))?.full_name ?? 'You'}</p>
      )}
    </td>
    <td data-label="Script" className="border p-1.5">
      <Input
        data-cell-editor={editable ? true : undefined}
        aria-label="Script"
        placeholder="Script / notes"
        value={values.script ?? ''}
        readOnly={!editable}
        disabled={mutation.isPending}
        className={cn(cellEditor.selected === rowId && focusedField === 'script' && 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30')}
        onFocus={() => {
          setFocusedField('script')
          cellEditor.select(rowId)
        }}
        onChange={event => change('script', event.target.value)}
      />
    </td>
    <td data-label="Approver" className="border p-1.5">
      {editable ? <select aria-label="Approver" className="w-full rounded-md border bg-background px-2 py-2 text-xs" value={values.approver_id} disabled={disabled} onChange={event => change('approver_id', event.target.value)}>
        <option value="">Select approver</option>{people.filter(person => person.id !== (values.creator_id || userId)).map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}
      </select> : <p className="px-1 py-2 text-sm">{entry?.approver?.full_name ?? 'Selected approver'}</p>}
    </td>
    <td data-label="Status" className="border p-1.5">
      <select aria-label="Status" className="sheet-select h-9 w-full rounded-md border px-2 text-xs font-medium disabled:opacity-60" value={status} disabled={mutation.isPending || (!editable && !canReview)} onChange={event => {
        const next = event.target.value as ContentStatus
        if (canReview) { if (next !== entry?.status) onDetails?.(next); return }
        setBase(current => current ?? entry)
        setStatusChange(next === (entry?.status ?? 'draft') ? undefined : next)
        onStartEditing?.()
      }}>
        {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value} disabled={value !== (entry?.status ?? 'draft') && !(editable && value === 'submitted') && !(canReview && ['changes_requested', 'approved'].includes(value))}>{label}</option>)}
      </select>
      {entry?.feedback && <p className="mt-2 whitespace-pre-wrap break-words text-xs">Feedback: {entry.feedback}</p>}
    </td>
    <td data-label="Caption" className="border p-1.5">
      <textarea
        data-cell-editor={editable ? true : undefined}
        aria-label="Caption"
        rows={2}
        className={cn('w-full resize-y rounded-md border bg-background p-2 text-sm', cellEditor.selected === rowId && focusedField === 'caption' && 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30')}
        value={values.caption}
        readOnly={!editable}
        disabled={mutation.isPending}
        onFocus={() => {
          setFocusedField('caption')
          cellEditor.select(rowId)
        }}
        onChange={event => change('caption', event.target.value)}
      />
    </td>
    <td data-label="Thumb" className="border p-1.5">
      <Input
        data-cell-editor={editable ? true : undefined}
        aria-label="Thumbnail URL"
        placeholder="https://…"
        value={values.thumbnail_url}
        readOnly={!editable}
        disabled={mutation.isPending}
        className={cn(cellEditor.selected === rowId && focusedField === 'thumbnail_url' && 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30')}
        onFocus={() => {
          setFocusedField('thumbnail_url')
          cellEditor.select(rowId)
        }}
        onChange={event => change('thumbnail_url', event.target.value)}
      />
      {/^https?:\/\//i.test(values.thumbnail_url) && <a href={values.thumbnail_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary underline">Open thumbnail</a>}
    </td>
    <td data-label="Actions" className="border p-2"><div className="flex flex-wrap gap-1">
      {editable && <>
        {(dirty || !entry) && (
          <Button
            size="icon"
            variant="ghost"
            className="relative h-7 w-7 text-foreground/80 hover:bg-muted hover:text-foreground"
            aria-label={status === 'submitted' ? 'Save and submit' : 'Save draft'}
            title={status === 'submitted' ? 'Save and submit' : 'Save draft'}
            disabled={!dirty || unavailable || mutation.isPending}
            onClick={() => save(status === 'submitted')}
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className="relative inline-flex items-center justify-center">
                <Save className="h-3.5 w-3.5" />
                {dirty && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-1.5 ring-background" />
                )}
              </span>
            )}
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Send for approval" title="Send for approval" disabled={(!dirty && !entry) || unavailable || mutation.isPending} onClick={() => save(true)}><Send className="h-3.5 w-3.5" /></Button>
        {(dirty || !entry) && <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cancel" title="Discard changes" disabled={!dirty || mutation.isPending} onClick={() => { setChanges({}); setBase(undefined); setStatusChange(undefined); setError(''); onRemove?.() }}><X className="h-3.5 w-3.5" /></Button>}
      </>}
      {entry && <Button variant="outline" size="sm" disabled={dirty || mutation.isPending} onClick={() => onDetails?.()}>{entry.approver_id === userId && entry.status === 'submitted' ? 'Review' : 'View details'}</Button>}
    </div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </td>
    {cellEditor.host && cellEditor.selected === rowId && focusedField && createPortal(
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
            {focusedField === 'package_name' ? 'PKG name' :
             focusedField === 'script' ? 'Script / notes' :
             focusedField === 'caption' ? 'Caption' :
             focusedField === 'thumbnail_url' ? 'Thumbnail URL' : focusedField}
            {values.package_name ? ` · ${values.package_name}` : ''}
          </span>
          <span className="text-muted-foreground">
            {!editable ? 'Read only' : 'Changes apply to this row. Click Save or Send when finished.'}
          </span>
        </div>
        <textarea
          id={`${rowId}-full-editor`}
          aria-label="Expanded editor"
          value={values[focusedField as keyof PackageValues] ?? ''}
          readOnly={!editable}
          rows={3}
          className="w-full resize-y rounded-md border bg-background p-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{ overflowWrap: 'anywhere' }}
          onChange={e => change(focusedField as keyof PackageValues, e.target.value)}
        />
      </div>,
      cellEditor.host
    )}
  </tr>
}
