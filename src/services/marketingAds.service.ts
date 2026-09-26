import { supabase } from '@/lib/supabase/client'
import type { MarketingAd } from '@/types/entities'
import type { DbMarketingAdInsert } from '@/types/database'

export async function fetchMarketingAds(): Promise<MarketingAd[]> {
  const { data, error } = await supabase
    .from('marketing_ads')
    .select('*')
    .eq('is_active', true)
    .order('advertiser')
  if (error) throw error
  return data ?? []
}

export async function fetchAllMarketingAds(): Promise<MarketingAd[]> {
  const { data, error } = await supabase
    .from('marketing_ads')
    .select('*')
    .order('advertiser')
  if (error) throw error
  return data ?? []
}

// Returns completed count for each ad on a given date
export async function fetchMarketingProgress(workDate: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('marketing_ad_id, status')
    .eq('work_date', workDate)
    .not('marketing_ad_id', 'is', null)

  if (error) throw error
  return data ?? []
}

export async function createMarketingAd(payload: DbMarketingAdInsert): Promise<MarketingAd> {
  const { data, error } = await supabase
    .from('marketing_ads')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMarketingAd(
  id: string,
  payload: Partial<DbMarketingAdInsert>
): Promise<MarketingAd> {
  const { data, error } = await supabase
    .from('marketing_ads')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
