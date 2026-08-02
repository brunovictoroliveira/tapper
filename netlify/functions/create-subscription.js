import { handleError, json, methodNotAllowed } from './_shared/http.js'
import { mercadoPagoRequest } from './_shared/mercadoPago.js'
import { getSupabaseAdmin, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    const admin = getSupabaseAdmin()
    const { data: current, error } = await admin.from('subscriptions').select('*')
      .eq('user_id', user.id).in('status', ['pending', 'active', 'past_due'])
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    if (current?.status === 'active') return json(409, { error: 'subscription_already_active' })

    const appUrl = process.env.APP_URL
    if (!appUrl) throw new Error('missing_app_url')
    const subscription = await mercadoPagoRequest('/preapproval', {
      method: 'POST',
      idempotencyKey: `tapper-subscription-${user.id}`,
      body: {
        reason: 'Tapper Cloud',
        external_reference: user.id,
        payer_email: user.email,
        back_url: `${appUrl}/account/subscription`,
        notification_url: `${appUrl}/.netlify/functions/mercadopago-webhook`,
        status: 'pending',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 9.99,
          currency_id: 'BRL',
        },
      },
    })

    const record = {
      user_id: user.id,
      provider: 'mercadopago',
      provider_subscription_id: String(subscription.id),
      status: 'pending',
    }
    const write = current
      ? await admin.from('subscriptions').update(record).eq('id', current.id)
      : await admin.from('subscriptions').insert(record)
    if (write.error) throw write.error
    return json(200, { checkoutUrl: subscription.init_point, subscriptionId: subscription.id })
  } catch (error) {
    return handleError(error)
  }
}
