import { getSupabaseClient } from '../lib/supabaseClient.js'

export async function getEntitlement() {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  if (!sessionData.session?.user) return { authenticated: false, canWriteCloud: false, profile: null, subscription: null }

  const userId = sessionData.session.user.id
  const [profileResult, subscriptionResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('subscriptions').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (profileResult.error) throw new Error(profileResult.error.message)
  if (subscriptionResult.error) throw new Error(subscriptionResult.error.message)

  const subscription = subscriptionResult.data
  const now = Date.now()
  const active = subscription?.status === 'active'
    && (!subscription.current_period_end || Date.parse(subscription.current_period_end) > now)
  const inGracePeriod = subscription?.status === 'past_due'
    && Date.parse(subscription.grace_period_end) > now

  return {
    authenticated: true,
    canWriteCloud: active || inGracePeriod,
    profile: profileResult.data,
    subscription,
  }
}
