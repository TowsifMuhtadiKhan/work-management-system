import type { WorkSection } from '@/types/workSection'
import { supabase } from '@/lib/supabase/client'
import type { MarketingAd } from '@/types/entities'
import type { DbMarketingAdInsert } from '@/types/database'

export async function fetchMarketingAds(section?: WorkSection): Promise<MarketingAd[]> {
  let query = supabase
    .from('marketing_ads')
    .select('*')
    .eq('is_active', true)
    .order('advertiser')
  if (section) query = query.eq('work_section', section)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchAllMarketingAds(section?: WorkSection): Promise<MarketingAd[]> {
  let query = supabase
    .from('marketing_ads')
    .select('*')
    .order('advertiser')
  if (section) query = query.eq('work_section', section)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Returns completed count for each ad on a given date
export async function fetchMarketingProgress(workDate: string, section?: WorkSection) {
  let query = supabase
    .from('tasks')
    .select('marketing_ad_id, status')
    .eq('work_date', workDate)
    .not('marketing_ad_id', 'is', null)

  if (section) query = query.eq('work_section', section)
  const { data, error } = await query
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
