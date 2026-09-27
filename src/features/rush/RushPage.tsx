import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SheetDraftRows, type DraftRowActions } from '@/components/common/SheetDraftRows'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { fetchAssignableProfiles } from '@/services/profiles.service'
import { TASK_STATUS_LABELS } from '@/types/enums'
import { fetchRushEntries, saveRushEntry, type RushEntry, type RushValues } from '@/services/rush.service'

export function RushPage() {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const query = useQuery({ queryKey: ['rush-entries'], queryFn: fetchRushEntries, enabled: !!user })
  const people = useQuery({ queryKey: ['assignable-profiles'], queryFn: fetchAssignableProfiles, enabled: !!user })
  const names = [...new Set((people.data ?? []).map(person => person.full_name))]
  const entries = query.data ?? []
  const unavailable = query.isPending || query.isError
  return <div className="p-3 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Rush</h1><p className="text-sm text-muted-foreground">Fill in a blank row, then save. A new blank row appears as you type.</p></div>
      <Button variant="outline" disabled={query.isFetching || people.isFetching} onClick={() => { void query.refetch(); void people.refetch() }}>Refresh</Button>
    </div>
    {query.isError && <p role="alert" className="text-destructive">Unable to load Rush entries. Saving is unavailable until the connection is restored. Your unsaved rows are kept here; refresh to retry.</p>}
    {query.isPending && <p role="status">Loading Rush entries...</p>}
    {people.isError && <p role="alert" className="text-destructive">Unable to load names. Refresh to try again.</p>}
    <div className="overflow-x-auto">
      <table className="responsive-sheet w-full min-w-[600px] table-fixed border-collapse border border-slate-400 text-sm">
        <caption className="border border-b-0 border-slate-400 bg-[#a8c4ed] py-2 text-lg font-bold text-black">RUSH</caption>
        <thead className="bg-[#d0e2f2] text-black"><tr>{['Reporter', 'Name', 'Status'].map(label => <th key={label} scope="col" className="border border-slate-400 px-3 py-2 uppercase font-semibold">{label}</th>)}<th scope="col" className="w-28 border border-slate-400 px-2">Actions</th></tr></thead>
        <tbody>
          {user && entries.map(entry => <RushRow key={entry.id} entry={entry} userId={user.id} names={names} namesUnavailable={people.isPending || people.isError} editable={entry.created_by === user.id || profile?.application_role === 'administrator'} unavailable={unavailable} />)}
          {user && <SheetDraftRows>{actions => <RushRow userId={user.id} names={names} namesUnavailable={people.isPending || people.isError} editable unavailable={unavailable} {...actions} />}</SheetDraftRows>}
        </tbody>
      </table>
    </div>
  </div>
}

function RushRow({ entry, userId, names, namesUnavailable, editable, unavailable, onStartEditing, onRemove }: { entry?: RushEntry; userId: string; names: string[]; namesUnavailable: boolean; editable: boolean; unavailable: boolean } & Partial<DraftRowActions>) {
  const client = useQueryClient()
  const [changes, setChanges] = useState<Partial<RushValues>>({})
  const [error, setError] = useState('')
  const values = { reporter: entry?.reporter ?? '', name: entry?.name ?? '', status: entry?.status ?? 'Pending', ...changes }
  const dirty = Object.keys(changes).length > 0
  const change = (field: keyof RushValues, value: string) => {
    setChanges(current => ({ ...current, [field]: value }))
    if (value.trim()) onStartEditing?.()
  }
  const statuses = Object.entries(TASK_STATUS_LABELS)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const mutation = useMutation({
    mutationFn: () => saveRushEntry({ reporter: values.reporter.trim(), name: values.name.trim(), status: values.status.trim() }, userId, entry?.id),
    onSuccess: saved => {
      client.setQueryData<RushEntry[]>(['rush-entries'], current => entry ? (current ?? []).map(row => row.id === saved.id ? saved : row) : [...(current ?? []), saved])
      setChanges({}); setError(''); onRemove?.(); toast.success('Row saved')
      void client.invalidateQueries({ queryKey: ['rush-entries'] })
    },
    onError: () => setError('Unable to save. Your row has been kept. Please retry.'),
  })
  return <tr className="align-top border-b">
    <td data-label="Reporter" className="border border-slate-400 p-1.5"><Input aria-label="Reporter" maxLength={300} value={values.reporter} readOnly={!editable} disabled={mutation.isPending} onChange={event => change('reporter', event.target.value)} /></td>
    <td data-label="Name" className="border border-slate-400 p-1.5"><select aria-label="Name" data-field="assigned_to" className="sheet-select h-9 w-full rounded-md border px-2 text-sm font-medium disabled:opacity-60" value={values.name} disabled={!editable || mutation.isPending || namesUnavailable} onChange={event => change('name', event.target.value)}>
      <option value="">Select name…</option>
      {values.name && !names.includes(values.name) && <option value={values.name}>{values.name}</option>}
      {names.map(name => <option key={name} value={name}>{name}</option>)}
    </select></td>
    <td data-label="Status" className="border border-slate-400 p-1.5"><select aria-label="Status" data-field="status" data-value={statuses.find(([, label]) => label === values.status)?.[0] ?? values.status} className="sheet-select h-9 w-full rounded-md border px-2 text-sm font-medium disabled:opacity-60" value={values.status} disabled={!editable || mutation.isPending} onChange={event => change('status', event.target.value)}>
      {!statuses.some(([, label]) => label === values.status) && <option value={values.status}>{values.status}</option>}
      {statuses.map(([key, label]) => <option key={key} value={label}>{label}</option>)}
    </select></td>
    <td data-label="Actions" className="border border-slate-400 p-2">
      {editable && (dirty || !entry) && <div className="flex gap-1">
        <Button size="icon" className="h-7 w-7 bg-emerald-700 hover:bg-emerald-800 text-white" aria-label="Save" title="Save row" disabled={!dirty || unavailable || mutation.isPending || Object.values(values).some(value => !value.trim())} onClick={() => mutation.mutate()}><Save className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Cancel" title="Discard changes" disabled={!dirty || mutation.isPending} onClick={() => { setChanges({}); setError(''); onRemove?.() }}><X className="h-3.5 w-3.5" /></Button>
      </div>}
      {dirty && <p className="mt-1 text-[10px] text-amber-700">Unsaved changes</p>}
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </td>
  </tr>
}
