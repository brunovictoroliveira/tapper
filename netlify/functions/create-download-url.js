import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { handleError, json, methodNotAllowed, parseBody } from './_shared/http.js'
import { getR2Bucket, getR2Client } from './_shared/r2.js'
import { getSupabaseAdmin, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    const { fileId } = parseBody(event)
    const { data: file, error } = await getSupabaseAdmin().from('cloud_files')
      .select('*').eq('id', fileId).eq('user_id', user.id).eq('status', 'ready').maybeSingle()
    if (error) throw error
    if (!file) throw new Error('file_not_found')
    const url = await getSignedUrl(getR2Client(), new GetObjectCommand({
      Bucket: getR2Bucket(), Key: file.object_key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
    }), { expiresIn: 300 })
    return json(200, { url, expiresIn: 300 })
  } catch (error) {
    return handleError(error)
  }
}
