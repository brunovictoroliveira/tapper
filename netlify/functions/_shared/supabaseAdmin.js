import { createClient } from '@supabase/supabase-js'

let adminClient

export function getSupabaseAdmin() {
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('missing_supabase_server_configuration')
  }
  if (!adminClient) {
    adminClient = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}

export async function requireUser(event) {
  const token = event.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('unauthorized')
  const { data, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !data.user) throw new Error('unauthorized')
  return data.user
}

export async function requireCloudWrite(userId) {
  const { data, error } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('status,current_period_end,grace_period_end')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  const now = Date.now()
  const active = data?.status === 'active' && (!data.current_period_end || Date.parse(data.current_period_end) > now)
  const grace = data?.status === 'past_due' && Date.parse(data.grace_period_end) > now
  if (!active && !grace) throw new Error('premium_required')
  return data
}
