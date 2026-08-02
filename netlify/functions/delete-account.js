import { DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { handleError, json, methodNotAllowed, parseBody } from './_shared/http.js'
import { mercadoPagoRequest } from './_shared/mercadoPago.js'
import { getR2Bucket, getR2Client } from './_shared/r2.js'
import { getSupabaseAdmin, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    const body = parseBody(event)
    if (body.confirmation !== 'EXCLUIR' || body.email?.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error('invalid_account_deletion_confirmation')
    }
    const admin = getSupabaseAdmin()
    const { data: subscription, error: subscriptionError } = await admin.from('subscriptions').select('*')
      .eq('user_id', user.id).in('status', ['pending', 'active', 'past_due'])
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (subscriptionError) throw subscriptionError
    if (subscription?.provider_subscription_id) {
      await mercadoPagoRequest(`/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`, {
        method: 'PUT', body: { status: 'cancelled' },
      })
    }

    const { data: files, error: filesError } = await admin.from('cloud_files').select('object_key').eq('user_id', user.id)
    if (filesError) throw filesError
    if (files.length) {
      await getR2Client().send(new DeleteObjectsCommand({
        Bucket: getR2Bucket(),
        Delete: { Objects: files.map((file) => ({ Key: file.object_key })), Quiet: true },
      }))
    }

    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id)
    if (deletionError) throw deletionError
    return json(200, { deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
