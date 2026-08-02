import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { handleError, json, methodNotAllowed, parseBody } from './_shared/http.js'
import { getR2Bucket, getR2Client } from './_shared/r2.js'
import { getSupabaseAdmin, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    const { fileId } = parseBody(event)
    const admin = getSupabaseAdmin()
    const { data: file, error } = await admin.from('cloud_files').select('*').eq('id', fileId).eq('user_id', user.id).maybeSingle()
    if (error) throw error
    if (!file) return json(200, { deleted: true })
    await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: file.object_key }))
    const result = await admin.rpc('delete_cloud_file_record', { file_id: file.id, owner_id: user.id })
    if (result.error) throw result.error
    return json(200, { deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
