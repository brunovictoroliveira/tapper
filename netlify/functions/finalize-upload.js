import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { handleError, json, methodNotAllowed, parseBody } from './_shared/http.js'
import { getR2Bucket, getR2Client } from './_shared/r2.js'
import { getSupabaseAdmin, requireCloudWrite, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    await requireCloudWrite(user.id)
    const { fileId } = parseBody(event)
    const admin = getSupabaseAdmin()
    const { data: file, error } = await admin.from('cloud_files').select('*').eq('id', fileId).eq('user_id', user.id).maybeSingle()
    if (error) throw error
    if (!file) throw new Error('upload_not_found')
    if (file.status === 'ready') return json(200, { file })

    let object
    try {
      object = await getR2Client().send(new HeadObjectCommand({
        Bucket: getR2Bucket(), Key: file.object_key, ChecksumMode: 'ENABLED',
      }))
    } catch {
      throw new Error('upload_not_found')
    }
    if (Number(object.ContentLength) !== Number(file.size_bytes)) throw new Error('size_mismatch')
    if (object.ChecksumSHA256 && object.ChecksumSHA256 !== file.checksum) throw new Error('checksum_mismatch')

    const result = await admin.rpc('finalize_cloud_file', { file_id: file.id })
    if (result.error) throw result.error
    return json(200, { file: result.data })
  } catch (error) {
    return handleError(error)
  }
}
