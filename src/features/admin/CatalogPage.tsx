import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { catalogConfig, catalogPayload, errorMessage } from './adminConfig'
import type { Catalog, AdminRow } from './adminConfig'

export function CatalogPage({ catalog }: { catalog: Catalog }) {
  const config = catalogConfig[catalog]
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminRow | 'new' | null>(null)
  const query = useQuery({
    queryKey: ['admin-catalog', catalog],
    queryFn: async () => {
      const { data, error } = await supabase.from(catalog).select('*').order(config.sort)
      if (error) throw error
      return data as AdminRow[]
    },
  })
  const rows = (query.data ?? []).filter(row => config.fields.some(field => String(row[field.key] ?? '').toLowerCase().includes(search.toLowerCase())))
  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-xl font-bold">{config.title}</h1><p className="text-sm text-muted-foreground mt-1">{config.description}</p></div>
        <Button onClick={() => setEditing('new')}><Plus className="mr-2 h-4 w-4" />Add {config.singular}</Button>
      </div>
      <Input aria-label={`Search ${config.title}`} placeholder={`Search ${config.title.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      {query.isPending ? <p role="status">Loading {config.title.toLowerCase()}...</p> : query.isError ? (
        <div role="alert" className="space-y-3"><p>{errorMessage(query.error)}</p><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{config.fields.filter(f => f.type !== 'textarea').map(f => <TableHead key={f.key}>{f.label}</TableHead>)}<TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {!rows.length && <TableRow><TableCell colSpan={config.fields.length + 2} className="py-10 text-center text-muted-foreground">{search ? 'No matching records.' : `No ${config.title.toLowerCase()} yet. Add your first one above.`}</TableCell></TableRow>}
              {rows.map(row => <TableRow key={row.id}>
                {config.fields.filter(f => f.type !== 'textarea').map(f => <TableCell key={f.key}>{f.type === 'color' ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border" style={{ backgroundColor: String(row[f.key]) }} />{String(row[f.key])}</span> : String(row[f.key] ?? '—')}</TableCell>)}
                <TableCell><Badge variant={row.is_active ? 'default' : 'secondary'}>{row.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell><Button variant="outline" size="sm" onClick={() => setEditing(row)}><Pencil className="mr-2 h-3 w-3" />Edit</Button></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
      )}
      {editing && <CatalogEditor catalog={catalog} row={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => {
        setEditing(null)
        void client.invalidateQueries()
      }} />}
    </div>
  )
}

function CatalogEditor({ catalog, row, onClose, onSaved }: { catalog: Catalog; row: AdminRow | null; onClose: () => void; onSaved: () => void }) {
  const config = catalogConfig[catalog]
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(config.fields.map(f => [f.key, String(row?.[f.key] ?? (f.type === 'color' ? '#3B82F6' : f.type === 'number' ? '0' : ''))])))
  const [active, setActive] = useState(row?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setError('')
    setSaving(true)
    try {
      const payload = catalogPayload(catalog, values, active)
      const query = row ? supabase.from(catalog).update(payload).eq('id', row.id) : supabase.from(catalog).insert(payload)
      const result = await query.select('id').single()
      if (result.error) throw result.error
      toast.success(`${config.singular} saved`)
      onSaved()
    } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{row ? 'Edit' : 'Add'} {config.singular}</DialogTitle><DialogDescription>Inactive records remain in existing assignments but are unavailable for new work.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <fieldset disabled={saving} className="space-y-4">
          {config.fields.map(field => <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{field.label}{field.required ? ' *' : ''}</Label>
            {field.type === 'textarea' ? <Textarea id={field.key} value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} /> :
              <Input id={field.key} type={field.type ?? 'text'} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 1 : undefined} required={field.required} value={values[field.key]} onChange={e => setValues({ ...values, [field.key]: e.target.value })} />}
          </div>)}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />Active</label>
        </fieldset>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>
}
