import { ErrorPage } from '@/pages/ErrorPage'
import { WORK_SECTION_LABELS, type WorkSection } from '@/types/workSection'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { FileSpreadsheet, ChevronRight } from 'lucide-react'
import { fetchMarketingAds, fetchMarketingProgress } from '@/services/marketingAds.service'
import { todayISO } from '@/utils/date'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { MarketingCampaignDialog } from './MarketingCampaignDialog'
import type { MarketingAd } from '@/types/entities'

export function MarketingPage({ section = 'digital' }: { section?: WorkSection }) {
  const [date, setDate] = useState(todayISO())
  const [selectedAd, setSelectedAd] = useState<MarketingAd | null>(null)
  const ads = useQuery({ queryKey: ['marketing-ads', section], queryFn: () => fetchMarketingAds(section) })
  const tasks = useQuery({ queryKey: ['marketing-progress', date, section], queryFn: () => fetchMarketingProgress(date, section) })

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Marketing ({WORK_SECTION_LABELS[section]})</h1>
          <p className="text-sm text-muted-foreground">
            Campaign delivery and daily targets. Click any campaign card to view duration reports and download Excel.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="marketing-date" className="text-sm font-medium">Work date</label>
        <Input
          id="marketing-date"
          type="date"
          className="w-48"
          value={date}
          onChange={e => { if (e.target.value) setDate(e.target.value) }}
        />
      </div>

      {ads.isError || tasks.isError ? (
        <ErrorPage title="Unable to load campaigns" retrying={ads.isFetching || tasks.isFetching} onRetry={() => { void ads.refetch(); void tasks.refetch() }} />
      ) : ads.isPending || tasks.isPending ? (
        <p role="status">Loading campaigns...</p>
      ) : !ads.data.length ? (
        <p className="text-muted-foreground">No active campaigns. Add one in Administration → Marketing Ads.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ads.data.map(ad => {
            const rows = tasks.data.filter(task => task.marketing_ad_id === ad.id)
            const done = rows.filter(task => task.status === 'done').length
            const inPeriod = (!ad.valid_from || date >= ad.valid_from) && (!ad.valid_to || date <= ad.valid_to)

            return (
              <article
                key={ad.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedAd(ad)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAd(ad) } }}
                className="group relative rounded-lg border bg-card p-5 space-y-3 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-base group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {ad.advertiser}
                      <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground" />
                    </h2>
                    <p className="text-sm text-muted-foreground">{ad.package_type}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded px-1.5 py-0.5 opacity-90 group-hover:opacity-100">
                    <FileSpreadsheet className="h-3 w-3" />
                    Report
                  </span>
                </div>

                {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
                {!inPeriod && <p className="text-xs text-amber-600 font-medium">Outside campaign dates</p>}

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Daily Progress</span>
                    <span className="font-medium text-foreground">
                      {ad.daily_target ? `${Math.round(Math.min(100, (done / ad.daily_target) * 100))}%` : '0%'}
                    </span>
                  </div>
                  <Progress
                    value={ad.daily_target ? Math.min(100, (done / ad.daily_target) * 100) : 0}
                    aria-label={`${ad.advertiser} target completion`}
                  />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1 border-t text-muted-foreground">
                  <span>Target: <strong className="text-foreground">{ad.daily_target}</strong></span>
                  <span>Assigned: <strong className="text-foreground">{rows.length}</strong></span>
                  <span>Done: <strong className="text-emerald-600 dark:text-emerald-400">{done}</strong></span>
                  <span>Remaining: <strong className={ad.daily_target - done > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}>{Math.max(0, ad.daily_target - done)}</strong></span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {selectedAd && (
        <MarketingCampaignDialog
          ad={selectedAd}
          onClose={() => setSelectedAd(null)}
        />
      )}
    </div>
  )
}
