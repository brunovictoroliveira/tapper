import { handleError, json, methodNotAllowed, parseBody } from './_shared/http.js'
import { mapSubscriptionStatus, mercadoPagoRequest, validateWebhookSignature } from './_shared/mercadoPago.js'
import { getSupabaseAdmin } from './_shared/supabaseAdmin.js'
import { createHash } from 'node:crypto'

function futureDate(days) {
  return new Date(Date.now() + days * 86400000).toISOString()
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  let payload
  try {
    payload = parseBody(event)
  } catch (error) {
    return handleError(error)
  }
  const dataId = event.queryStringParameters?.['data.id'] || payload.data?.id
  const signatureIsValid = validateWebhookSignature({
    xSignature: event.headers['x-signature'],
    xRequestId: event.headers['x-request-id'],
    dataId,
    secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET,
  })
  if (!signatureIsValid) return json(401, { error: 'invalid_signature' })

  const admin = getSupabaseAdmin()
  const payloadHash = createHash('sha256').update(event.body || '').digest('hex')
  const eventId = `${payload.type || 'subscription'}:${payloadHash}`
  const { data: existing } = await admin.from('payment_events').select('*').eq('provider_event_id', eventId).maybeSingle()
  if (existing?.processed_at) return json(200, { received: true, duplicate: true })

  if (!existing) {
    const inserted = await admin.from('payment_events').insert({
      provider_event_id: eventId,
      event_type: payload.action || payload.type || 'subscription.updated',
      payload,
      attempts: 1,
    })
    if (inserted.error && inserted.error.code !== '23505') return handleError(inserted.error)
  } else {
    await admin.from('payment_events').update({ attempts: existing.attempts + 1, last_error: null }).eq('id', existing.id)
  }

  try {
    const subscription = await mercadoPagoRequest(`/preapproval/${encodeURIComponent(dataId)}`)
    const userId = subscription.external_reference
    if (!/^[0-9a-f-]{36}$/i.test(userId || '')) throw new Error('invalid_external_reference')
    const status = mapSubscriptionStatus(subscription.status)
    const record = {
      user_id: userId,
      provider: 'mercadopago',
      provider_subscription_id: String(subscription.id),
      status,
      current_period_end: subscription.next_payment_date || null,
      grace_period_end: status === 'past_due' ? futureDate(7) : null,
    }
    const { data: current } = await admin.from('subscriptions').select('id')
      .eq('provider_subscription_id', String(subscription.id)).maybeSingle()
    const write = current
      ? await admin.from('subscriptions').update(record).eq('id', current.id)
      : await admin.from('subscriptions').insert(record)
    if (write.error) throw write.error
    const profileUpdate = await admin.from('profiles').update({ plan: status === 'active' ? 'premium' : 'free' }).eq('id', userId)
    if (profileUpdate.error) throw profileUpdate.error
    await admin.from('payment_events').update({
      user_id: userId, processed_at: new Date().toISOString(), last_error: null,
    }).eq('provider_event_id', eventId)
    return json(200, { received: true })
  } catch (error) {
    await admin.from('payment_events').update({ last_error: error.message }).eq('provider_event_id', eventId)
    return handleError(error)
  }
}
