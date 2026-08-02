import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import { mapSubscriptionStatus, validateWebhookSignature } from '../netlify/functions/_shared/mercadoPago.js'

test('valida a assinatura HMAC do webhook Mercado Pago', () => {
  const secret = 'webhook-secret'
  const timestamp = 1785696000
  const dataId = 'ABC123'
  const requestId = 'request-1'
  const manifest = `id:abc123;request-id:${requestId};ts:${timestamp};`
  const signature = createHmac('sha256', secret).update(manifest).digest('hex')
  assert.equal(validateWebhookSignature({
    xSignature: `ts=${timestamp},v1=${signature}`,
    xRequestId: requestId,
    dataId,
    secret,
  }), true)
  assert.equal(validateWebhookSignature({
    xSignature: `ts=${timestamp},v1=${'0'.repeat(64)}`,
    xRequestId: requestId,
    dataId,
    secret,
  }), false)
})

test('mapeia estados externos sem conceder premium por padrão', () => {
  assert.equal(mapSubscriptionStatus('authorized'), 'active')
  assert.equal(mapSubscriptionStatus('paused'), 'past_due')
  assert.equal(mapSubscriptionStatus('cancelled'), 'cancelled')
  assert.equal(mapSubscriptionStatus('unexpected'), 'pending')
})
