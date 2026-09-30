import type { WorkSection } from '@/types/workSection'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TableProperties } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Pagination } from '@/components/common/Pagination'
import { fetchMarketingAds, fetchMarketingProgress } from '@/services/marketingAds.service'

export function MarketingDailySheet({ workDate, section }: { workDate: string; section?: WorkSection }) {
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const ads = useQuery({ queryKey: ['marketing-ads', section], queryFn: () => fetchMarketingAds(section), enabled: open })
  const progress = useQuery({ queryKey: ['marketing-progress', workDate, section], queryFn: () => fetchMarketingProgress(workDate, section), enabled: open, refetchInterval: open ? 15000 : false })
  const counts = new Map<string, number>()
  for (const task of progress.data ?? []) {
    if (task.marketing_ad_id && task.status === 'done') counts.set(task.marketing_ad_id, (counts.get(task.marketing_ad_id) ?? 0) + 1)
  }
  const rows = (ads.data ?? []).filter(ad => (!ad.valid_from || ad.valid_from <= workDate) && (!ad.valid_to || ad.valid_to >= workDate))

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedRows = rows.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)

  const totalDailyTarget = rows.reduce((sum, ad) => sum + (Number(ad.daily_target) || 0), 0)
  const totalUploaded = rows.reduce((sum, ad) => sum + (counts.get(ad.id) ?? 0), 0)
  const totalRemaining = rows.reduce((sum, ad) => {
    const uploaded = counts.get(ad.id) ?? 0
    return sum + Math.max(0, (Number(ad.daily_target) || 0) - uploaded)
  }, 0)

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="icon" title="Marketing Daily Sheet" aria-label="Open Marketing Daily Sheet"><TableProperties className="h-4 w-4" /></Button></DialogTrigger>
    <DialogContent className="max-w-3xl" onPointerDownOutside={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()} onEscapeKeyDown={event => event.preventDefault()}>
      <DialogHeader><DialogTitle>Marketing Daily Sheet</DialogTitle><DialogDescription>{workDate} · Uploaded counts tasks marked Done for this date, independently of the task filters.</DialogDescription></DialogHeader>
      {ads.isError || progress.isError ? <div role="alert" className="space-y-2 text-sm"><p>Unable to load the marketing sheet.</p><Button variant="outline" onClick={() => { void ads.refetch(); void progress.refetch() }}>Retry</Button></div>
        : ads.isPending || progress.isPending ? <p role="status">Loading marketing sheet...</p>
        : !rows.length ? <p className="text-sm text-muted-foreground">No active marketing ads for this date.</p>
        : <div className="space-y-2">
            <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
              <thead className="bg-green-800 text-white"><tr>{['Marketing', 'PKG Type', 'Daily QTY', 'Uploaded', 'Remaining'].map((label, index) => <th scope="col" key={label} className={`border p-2 break-words ${index < 2 ? 'w-[27%] text-left' : 'text-center'}`}>{label}</th>)}</tr></thead>
              <tbody>{paginatedRows.map(ad => {
                const uploaded = counts.get(ad.id) ?? 0
                const remaining = Math.max(0, ad.daily_target - uploaded)
                return <tr key={ad.id} className="odd:bg-sky-50 dark:odd:bg-sky-950/30">
                  <th scope="row" className="border p-2 text-left font-semibold break-words">{ad.advertiser}</th>
                  <td className="border p-2 break-words">{ad.package_type}</td>
                  <td className="border p-2 text-center tabular-nums">{ad.daily_target}</td>
                  <td className="border p-2 text-center tabular-nums">{uploaded}</td>
                  <td className={`border p-2 text-center font-semibold tabular-nums ${remaining ? 'bg-red-700 text-white' : 'bg-emerald-100 text-emerald-900'}`}>{remaining}</td>
                </tr>
              })}</tbody>
              <tfoot className="border-t-2 border-foreground/20 bg-muted/90 font-bold">
                <tr>
                  <th scope="row" colSpan={2} className="border p-2 text-left font-bold uppercase tracking-wider">Total</th>
                  <td className="border p-2 text-center tabular-nums font-bold">{totalDailyTarget}</td>
                  <td className="border p-2 text-center tabular-nums font-bold">{totalUploaded}</td>
                  <td className={`border p-2 text-center font-bold tabular-nums ${totalRemaining ? 'bg-red-800 text-white' : 'bg-emerald-700 text-white'}`}>{totalRemaining}</td>
                </tr>
              </tfoot>
            </table>
            {rows.length > 0 && (
              <Pagination
                currentPage={safeCurrentPage}
                totalItems={rows.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>}
      <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>
}
