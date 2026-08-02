import { createHmac, timingSafeEqual } from 'node:crypto'

const API_URL = 'https://api.mercadopago.com'

function accessToken() {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) throw new Error('missing_mercadopago_configuration')
  return process.env.MERCADO_PAGO_ACCESS_TOKEN
}

export async function mercadoPagoRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = { authorization: `Bearer ${accessToken()}`, 'content-type': 'application/json' }
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error('mercadopago_request_failed')
    error.details = result
    throw error
  }
  return result
}

export function validateWebhookSignature({ xSignature, xRequestId, dataId, secret }) {
  if (!xSignature || !xRequestId || !dataId || !secret) return false
  const parts = Object.fromEntries(xSignature.split(',').map((part) => part.trim().split('=')))
  if (!parts.ts || !parts.v1 || !/^\d+$/.test(parts.ts)) return false
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${parts.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const receivedBuffer = Buffer.from(parts.v1, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

export function mapSubscriptionStatus(status) {
  if (status === 'authorized') return 'active'
  if (status === 'paused') return 'past_due'
  if (status === 'cancelled') return 'cancelled'
  return 'pending'
}
