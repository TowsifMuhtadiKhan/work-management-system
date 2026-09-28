import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table'
import { Pagination } from '@/components/common/Pagination'
import { catalogConfig, catalogPayload, errorMessage } from './adminConfig'
import type { Catalog, AdminRow } from './adminConfig'

export function CatalogPage({ catalog }: { catalog: Catalog }) {
  const config = catalogConfig[catalog]
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<AdminRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<AdminRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setCurrentPage(1)
  }, [catalog, search])

  const query = useQuery({
    queryKey: ['admin-catalog', catalog],
    queryFn: async () => {
      const { data, error } = await supabase.from(catalog).select('*').order(config.sort)
      if (error) throw error
      return data as AdminRow[]
    },
  })

  async function handleDelete() {
    if (!deleting) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from(catalog).delete().eq('id', deleting.id)
      if (error) {
        if (
          error.code === '23503' ||
          error.message?.includes('foreign key') ||
          error.message?.includes('violates foreign key')
        ) {
          throw new Error(
            `Cannot delete "${deleting.name || deleting.advertiser || config.singular}" because it is currently linked to existing tasks or assignments. You can edit and mark it as "Inactive" instead.`
          )
        }
        throw error
      }
      toast.success(`${config.singular} deleted successfully`)
      setDeleting(null)
      void client.invalidateQueries()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const rows = (query.data ?? []).filter(row =>
    config.fields.some(field => String(row[field.key] ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const deletingItemName = deleting
    ? String(deleting.name || deleting.advertiser || config.singular)
    : config.singular

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{config.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="mr-2 h-4 w-4" />Add {config.singular}
        </Button>
      </div>

      <Input
        aria-label={`Search ${config.title}`}
        placeholder={`Search ${config.title.toLowerCase()}...`}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {query.isPending ? (
        <p role="status">Loading {config.title.toLowerCase()}...</p>
      ) : query.isError ? (
        <div role="alert" className="space-y-3">
          <p>{errorMessage(query.error)}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {config.fields.filter(f => f.type !== 'textarea').map(f => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={config.fields.length + 2} className="py-10 text-center text-muted-foreground">
                      {search ? 'No matching records.' : `No ${config.title.toLowerCase()} yet. Add your first one above.`}
                    </TableCell>
                  </TableRow>
                )}
                {paginatedRows.map(row => (
                  <TableRow key={row.id}>
                    {config.fields.filter(f => f.type !== 'textarea').map(f => (
                      <TableCell key={f.key}>
                        {f.type === 'color' ? (
                          row[f.key] ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 rounded border shrink-0" style={{ backgroundColor: String(row[f.key]) }} />
                              <span className="font-mono text-xs">{String(row[f.key])}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          String(row[f.key] ?? '—')
                        )}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Badge variant={row.is_active ? 'default' : 'secondary'}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {rows.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={rows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}

      {editing && (
        <CatalogEditor
          catalog={catalog}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void client.invalidateQueries()
          }}
          onRequestDelete={(row) => {
            setEditing(null)
            setDeleting(row)
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => { if (!open && !isDeleting) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {config.singular}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingItemName}</strong>? This action cannot be undone.
              If this {config.singular.toLowerCase()} has historical assignments or tasks, consider marking it as Inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CatalogEditor({
  catalog,
  row,
  onClose,
  onSaved,
  onRequestDelete,
}: {
  catalog: Catalog
  row: AdminRow | null
  onClose: () => void
  onSaved: () => void
  onRequestDelete?: (row: AdminRow) => void
}) {
  const config = catalogConfig[catalog]
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      config.fields.map(f => [
        f.key,
        String(row?.[f.key] ?? (f.type === 'color' ? '#3B82F6' : f.type === 'number' ? '0' : '')),
      ])
    )
  )
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
      const query = row
        ? supabase.from(catalog).update(payload).eq('id', row.id)
        : supabase.from(catalog).insert(payload)
      const result = await query.select('id').single()
      if (result.error) throw result.error
      toast.success(`${config.singular} saved`)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? 'Edit' : 'Add'} {config.singular}</DialogTitle>
          <DialogDescription>
            Inactive records remain in existing assignments but are unavailable for new work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <fieldset disabled={saving} className="space-y-4">
            {config.fields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>
                  {field.label}{field.required ? ' *' : ''}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    value={values[field.key]}
                    onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type ?? 'text'}
                    min={field.type === 'number' ? 0 : undefined}
                    step={field.type === 'number' ? 1 : undefined}
                    required={field.required}
                    value={values[field.key]}
                    onChange={e => setValues({ ...values, [field.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
              Active
            </label>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {row && onRequestDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                disabled={saving}
                onClick={() => onRequestDelete(row)}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete {config.singular}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2 ml-auto">
              <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
