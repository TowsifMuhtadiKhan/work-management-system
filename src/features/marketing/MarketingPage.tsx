import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchMarketingAds, fetchMarketingProgress } from '@/services/marketingAds.service'
import { todayISO } from '@/utils/date'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

export function MarketingPage() {
  const [date, setDate] = useState(todayISO())
  const ads = useQuery({ queryKey: ['marketing-ads'], queryFn: fetchMarketingAds })
  const tasks = useQuery({ queryKey: ['marketing-progress', date], queryFn: () => fetchMarketingProgress(date) })
  return <div className="p-3 sm:p-6 space-y-6">
    <div><h1 className="text-xl font-bold">Marketing Tracking</h1>
      <p className="text-sm text-muted-foreground">Campaign delivery and daily targets.</p></div>
    <div className="space-y-2"><label htmlFor="marketing-date" className="text-sm">Work date</label>
      <Input id="marketing-date" type="date" className="w-48" value={date} onChange={e => { if (e.target.value) setDate(e.target.value) }} /></div>
    {ads.isError || tasks.isError ? <p role="alert">Unable to load campaigns. Please refresh and try again.</p>
      : ads.isPending || tasks.isPending ? <p role="status">Loading campaigns...</p>
      : !ads.data.length ? <p className="text-muted-foreground">No active campaigns. Add one in Administration → Marketing Ads.</p>
      : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ads.data.map(ad => {
        const rows = tasks.data.filter(task => task.marketing_ad_id === ad.id)
        const done = rows.filter(task => task.status === 'done').length
        const inPeriod = (!ad.valid_from || date >= ad.valid_from) && (!ad.valid_to || date <= ad.valid_to)
        return <article key={ad.id} className="rounded-lg border bg-card p-5 space-y-3">
          <div><h2 className="font-semibold">{ad.advertiser}</h2><p className="text-sm text-muted-foreground">{ad.package_type}</p></div>
          <p className="text-sm">{ad.description}</p>
          {!inPeriod && <p className="text-sm text-amber-600">Outside campaign dates</p>}
          <Progress value={ad.daily_target ? Math.min(100, done / ad.daily_target * 100) : 0} aria-label={`${ad.advertiser} target completion`} />
          <div className="flex flex-wrap gap-4 text-sm"><span>Target: {ad.daily_target}</span><span>Assigned: {rows.length}</span><span>Done: {done}</span><span>Remaining: {Math.max(0, ad.daily_target - done)}</span></div>
        </article>
      })}</div>}
  </div>
}
