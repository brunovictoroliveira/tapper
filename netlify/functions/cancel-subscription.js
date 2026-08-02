import { handleError, json, methodNotAllowed } from './_shared/http.js'
import { mercadoPagoRequest } from './_shared/mercadoPago.js'
import { getSupabaseAdmin, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    const admin = getSupabaseAdmin()
    const { data: subscription, error } = await admin.from('subscriptions').select('*')
      .eq('user_id', user.id).in('status', ['pending', 'active', 'past_due'])
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (!subscription) return json(200, { cancelled: true })
    await mercadoPagoRequest(`/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, {
      method: 'PUT', body: { status: 'cancelled' },
    })
    const readOnlyUntil = new Date(Date.now() + 30 * 86400000).toISOString()
    const update = await admin.from('subscriptions').update({
      status: 'cancelled', grace_period_end: readOnlyUntil,
    }).eq('id', subscription.id)
    if (update.error) throw update.error
    await admin.from('profiles').update({ plan: 'free' }).eq('id', user.id)
    return json(200, { cancelled: true, readOnlyUntil })
  } catch (error) {
    return handleError(error)
  }
}
