import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clapperboard } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { fetchAssignableProfiles } from '@/services/profiles.service'
import { fetchTaskTypes } from '@/services/taskTypes.service'
import { CONTENT_STATUS_LABELS, fetchContentPackages, fetchContentReviews, reviewContentPackage, saveContentPackage } from '@/services/contentPackages.service'
import type { ApprovalValues, ContentPackage, PackageValues } from '@/services/contentPackages.service'
import { todayISO } from '@/utils/date'
import { TIME_SLOTS, slotLabel } from '@/features/tasks/timeSlots'

import { SheetDraftRows } from '@/components/common/SheetDraftRows'
import { ContentPackageRow } from './ContentPackageRow'

const fieldClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60'

export function ContentCreatorPage() {
  const { user } = useAuth()
  const profile = useProfile(user?.id)
  const isLead = ['administrator', 'manager', 'team_lead'].includes(profile.data?.application_role ?? '')
  const [params, setParams] = useSearchParams()
  const people = useQuery({ queryKey: ['assignable-profiles'], queryFn: fetchAssignableProfiles, enabled: !!user })
  const [view, setView] = useState('all')
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['content-packages', user?.id], queryFn: fetchContentPackages, enabled: !!user, refetchInterval: 30000 })
  const packages = query.data ?? []
  const selected = packages.find(entry => entry.id === params.get('package'))
  const rows = packages.filter(entry => view === 'mine' ? entry.creator_id === user?.id : view === 'review' ? entry.approver_id === user?.id && entry.status === 'submitted' : true)
  const close = () => { setParams({}, { replace: true }) }
  const saved = () => {
    for (const key of ['content-packages', 'content-reviews', 'tasks', 'daily-stats', 'tasks-by-employee']) void client.invalidateQueries({ queryKey: [key] })
    close()
  }
  return <div className="p-3 sm:p-6 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Content Creator</h1><p className="text-sm text-muted-foreground">Fill in a blank row, then save or send for approval. A new blank row appears as you type.</p></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {([['all', 'All packages'], ['mine', 'My packages'], ['review', 'Awaiting my review']] as const).map(([value, label]) => <Button key={value} variant={view === value ? 'default' : 'outline'} aria-pressed={view === value} onClick={() => setView(value)}>{label}</Button>)}
      <Button variant="outline" disabled={query.isFetching || people.isFetching} onClick={() => { void query.refetch(); void people.refetch() }}>Refresh</Button>
    </div>
    {query.isError && <p role="alert" className="text-destructive">Unable to load content packages. Your unsaved rows are kept here. Refresh to restore saving.</p>}
    {query.isPending && <p role="status">Loading content packages...</p>}
    {people.isError && <p role="alert" className="text-destructive">Unable to load approvers. Refresh to try again.</p>}
      <div className="overflow-x-auto rounded-md border">
        <table className="responsive-sheet w-full min-w-[1350px] table-fixed border-collapse text-sm">
          <caption className="bg-red-600 px-4 py-3 text-xl font-bold text-white">CONTENT CREATOR PKG LIST</caption>
          <thead className="bg-muted"><tr>{['PKG name', 'Creator name', 'Script', 'Approver', 'Status', 'Caption', 'Thumb', 'Actions'].map(label => <th scope="col" key={label} className="border px-3 py-2 text-left uppercase">{label}</th>)}</tr></thead>
          <tbody>
            {user && rows.map(entry => <ContentPackageRow key={entry.id} entry={entry} userId={user.id} canManage={isLead} people={people.data ?? []} unavailable={query.isError || query.isPending} onDetails={action => setParams({ package: entry.id, ...(action ? { action } : {}) })} />)}
            {user && <SheetDraftRows>{actions => <ContentPackageRow userId={user.id} canManage={isLead} people={people.data ?? []} hidden={view === 'review'} unavailable={query.isError || query.isPending || people.isError || people.isPending} {...actions} />}</SheetDraftRows>}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="text-sm text-muted-foreground">{view === 'review' ? 'No packages are waiting for your review.' : 'Start typing in the blank row to create a package.'}</p>}
      {params.has('package') && !selected && <p role="alert">This package is unavailable or you do not have access.</p>}
    {user && selected && <PackageDialog key={selected.id} entry={selected} requestedAction={params.get('action')} userId={user.id} canManage={isLead} onClose={close} onSaved={saved} />}
  </div>
}

function Thumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  if (!/^https?:\/\//i.test(url)) return <span className="text-muted-foreground">No thumbnail</span>
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
    {!failed && <img src={url} alt="Package thumbnail" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="mb-2 max-h-32 w-full rounded object-contain" />}
    Open thumbnail
  </a>
}

function PackageDialog({ entry: initialEntry, requestedAction, userId, canManage, onClose, onSaved }: { entry?: ContentPackage; requestedAction: string | null; userId: string; canManage?: boolean; onClose: () => void; onSaved: () => void }) {
  // Keep the version opened by the user so background refreshes cannot overwrite
  // concurrent edits using a newer version number with stale form values.
  const [entry] = useState(initialEntry)
  const editable = !entry || ((entry.creator_id === userId || canManage) && ['draft', 'changes_requested'].includes(entry.status))
  const canReview = entry?.approver_id === userId && entry.status === 'submitted'
  const people = useQuery({ queryKey: ['assignable-profiles'], queryFn: fetchAssignableProfiles, enabled: editable || canReview })
  const types = useQuery({ queryKey: ['task-types'], queryFn: fetchTaskTypes, enabled: canReview })
  const reviews = useQuery({ queryKey: ['content-reviews', entry?.id], queryFn: () => fetchContentReviews(entry!.id), enabled: !!entry })
  const [values, setValues] = useState<PackageValues>({
    package_name: entry?.package_name ?? '',
    creator_id: entry?.creator_id ?? userId,
    script: entry?.script ?? '',
    approver_id: entry?.approver_id ?? '',
    caption: entry?.caption ?? '',
    thumbnail_url: entry?.thumbnail_url ?? '',
  })
  const [feedback, setFeedback] = useState('')
  const [approval, setApproval] = useState<ApprovalValues>({ work_date: todayISO(), time_slot: '08:00', task_type_id: '', assigned_to: entry?.creator_id ?? '' })
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: async (action: 'draft' | 'submit' | 'feedback' | 'changes_requested' | 'approved') => {
      if (action === 'draft' || action === 'submit') return saveContentPackage(values, userId, action === 'submit', entry)
      return reviewContentPackage(entry!, action === 'feedback' ? 'submitted' : action, feedback, approval)
    },
    onSuccess: (_, action) => { toast.success(action === 'approved' ? 'Approved and added to Daily Tasks' : action === 'submit' ? 'Sent for approval' : action === 'draft' ? 'Draft saved' : 'Feedback sent'); onSaved() },
    onError: () => setError('Unable to save. The package may have changed or your access may have changed. Close and refresh before retrying; your entries are still here.'),
  })
  const submit = (action: 'draft' | 'submit' | 'feedback' | 'changes_requested' | 'approved') => {
    setError('')
    if (mutation.isPending) return
    if (action === 'draft' || action === 'submit') {
      if (!values.package_name.trim() || !values.approver_id) { setError('Enter a package name and select an approver.'); return }
      if ((values.creator_id || userId) === values.approver_id) { setError('Creator and approver must be different people.'); return }
      if (values.thumbnail_url.trim()) {
        try { if (!['http:', 'https:'].includes(new URL(values.thumbnail_url.trim()).protocol)) throw new Error() }
        catch { setError('Enter a valid http or https thumbnail URL.'); return }
      }
    } else if (action === 'approved') {
      if (!approval.work_date || !approval.task_type_id || !approval.assigned_to) { setError('Choose a work date, task type, and assigned person.'); return }
    } else if (!feedback.trim()) { setError('Enter feedback before sending your review.'); return }
    mutation.mutate(action)
  }
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{!entry ? 'Add content package' : canReview ? 'Review content package' : editable ? 'Edit content package' : 'Content package'}</DialogTitle><DialogDescription>{entry ? CONTENT_STATUS_LABELS[entry.status] : 'Choose the person who will review and approve this package.'}</DialogDescription></DialogHeader>
      <fieldset disabled={mutation.isPending} className="space-y-4 min-w-0">
        {editable ? <>
          <label className="block space-y-1 text-sm font-medium">PKG name<Input maxLength={300} value={values.package_name} onChange={event => setValues({ ...values, package_name: event.target.value })} /></label>
          <label className="block space-y-1 text-sm font-medium">Creator<select aria-label="Creator" className={fieldClass} value={values.creator_id || userId} onChange={event => setValues({ ...values, creator_id: event.target.value })}>
            <option value="">Select creator</option>{(people.data ?? []).map(person => <option key={person.id} value={person.id} disabled={person.id === values.approver_id}>{person.full_name}</option>)}
          </select></label>
          <label className="block space-y-1 text-sm font-medium">Script<Input aria-label="Script" placeholder="Script / notes" value={values.script ?? ''} onChange={event => setValues({ ...values, script: event.target.value })} /></label>
          <label className="block space-y-1 text-sm font-medium">Approver<select aria-label="Approver" className={fieldClass} value={values.approver_id} onChange={event => setValues({ ...values, approver_id: event.target.value })}>
            <option value="">Select approver</option>{(people.data ?? []).filter(person => person.id !== (values.creator_id || userId)).map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select></label>
          <label className="block space-y-1 text-sm font-medium">Caption<textarea aria-label="Caption" className={fieldClass} rows={5} value={values.caption} onChange={event => setValues({ ...values, caption: event.target.value })} /></label>
          <label className="block space-y-1 text-sm font-medium">Thumbnail URL<Input type="url" placeholder="https://…" value={values.thumbnail_url} onChange={event => setValues({ ...values, thumbnail_url: event.target.value })} /></label>
          {entry?.feedback && <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 whitespace-pre-wrap">Approver feedback: {entry.feedback}</p>}
        </> : entry && <div className="space-y-3 text-sm">
          <h2 className="font-semibold">{entry.package_name}</h2>
          <p>Creator: {entry.creator?.full_name ?? 'Creator'} · Approver: {entry.approver?.full_name ?? 'Selected approver'}</p>
          {entry.script && <p className="text-sm"><span className="font-semibold">Script:</span> {entry.script}</p>}
          <p className="whitespace-pre-wrap break-words">{entry.caption || 'No caption'}</p>
          <div className="max-w-xs"><Thumbnail url={entry.thumbnail_url} /></div>
          {entry.status === 'approved' && <Link className="inline-flex items-center gap-2 text-primary underline" to={`/tasks?date=${entry.work_date}`}><Clapperboard className="h-4 w-4" />View Daily Task ({entry.work_date}, {slotLabel(entry.time_slot ?? '')})</Link>}
        </div>}
        {canReview && <>
          {requestedAction === 'approved' && <p className="text-sm">Complete the Daily Task details, then confirm approval below.</p>}
          {requestedAction === 'changes_requested' && <p className="text-sm">Enter your feedback, then confirm Request changes below.</p>}
          <label className="block space-y-1 text-sm font-medium">Feedback<textarea aria-label="Feedback" className={fieldClass} rows={3} value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="Share feedback or explain requested changes" /></label>
          <div className="rounded-md border p-3 space-y-3"><h2 className="font-semibold text-sm">Daily Task details on approval</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-sm">Work date<Input type="date" value={approval.work_date ?? ''} onChange={event => setApproval({ ...approval, work_date: event.target.value })} /></label>
              <label className="space-y-1 text-sm">Time section<select aria-label="Time section" className={fieldClass} value={approval.time_slot ?? ''} onChange={event => setApproval({ ...approval, time_slot: event.target.value || null })}><option value="">Unscheduled</option>{TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slotLabel(slot)}</option>)}</select></label>
              <label className="space-y-1 text-sm">Task type<select aria-label="Task type" className={fieldClass} value={approval.task_type_id ?? ''} onChange={event => setApproval({ ...approval, task_type_id: event.target.value })}><option value="">Select type</option>{(types.data ?? []).map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label className="space-y-1 text-sm">Assigned person<select aria-label="Assigned person" className={fieldClass} value={approval.assigned_to ?? ''} onChange={event => setApproval({ ...approval, assigned_to: event.target.value })}><option value="">Select person</option>{(people.data ?? []).map(person => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label>
            </div>
          </div>
        </>}
        {(people.isError || (canReview && types.isError)) && <p role="alert" className="text-destructive text-sm">Unable to load people or task types. Close and refresh to try again.</p>}
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {editable && <><Button variant="outline" onClick={() => submit('draft')}>Save draft</Button><Button onClick={() => submit('submit')}>Send for approval</Button></>}
          {canReview && <><Button variant="outline" onClick={() => submit('feedback')}>Send feedback</Button><Button variant="outline" onClick={() => submit('changes_requested')}>Request changes</Button><Button onClick={() => submit('approved')}>Approve & add to Daily Tasks</Button></>}
        </div>
        {mutation.isPending && <p role="status" className="text-sm">Saving...</p>}
      </fieldset>
      {entry && <section className="border-t pt-4 space-y-3"><h2 className="text-sm font-semibold">Review history</h2>
        {reviews.isPending ? <p className="text-sm">Loading history...</p> : reviews.isError ? <p role="alert" className="text-sm text-destructive">Unable to load review history.</p> : !reviews.data?.length ? <p className="text-sm text-muted-foreground">No reviews yet.</p> : reviews.data.map(review => <div key={review.id} className="rounded-md bg-muted p-3 text-sm">
          <p className="font-medium">{review.reviewer?.full_name ?? 'User'} · {review.action === 'feedback' ? 'Feedback' : review.action === 'submitted' ? 'Sent for approval' : CONTENT_STATUS_LABELS[review.action]}</p>
          <p className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleString()}</p>
          {review.feedback && <p className="mt-2 whitespace-pre-wrap break-words">{review.feedback}</p>}
        </div>)}
      </section>}
    </DialogContent>
  </Dialog>
}
