import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { validateUpload } from './_shared/cloudFiles.js'
import { handleError, json, methodNotAllowed, parseBody } from './_shared/http.js'
import { getR2Bucket, getR2Client } from './_shared/r2.js'
import { getSupabaseAdmin, requireCloudWrite, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'POST') return methodNotAllowed()
  try {
    const user = await requireUser(event)
    await requireCloudWrite(user.id)
    const body = parseBody(event)
    const valid = validateUpload(body)
    const fileId = crypto.randomUUID()
    const objectKey = `users/${user.id}/songs/${body.songId}/${fileId}.${valid.extension}`
    const { data, error } = await getSupabaseAdmin().rpc('reserve_cloud_file', {
      file_id: fileId,
      owner_id: user.id,
      related_song_id: body.songId,
      object_path: objectKey,
      original_filename: valid.originalName,
      content_type: body.mimeType,
      content_size: body.sizeBytes,
      content_checksum: body.checksum,
    })
    if (error) throw new Error(error.message.includes('storage_quota_exceeded') ? 'storage_quota_exceeded' : error.message)

    const url = await getSignedUrl(getR2Client(), new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: objectKey,
      ContentType: body.mimeType,
      ChecksumSHA256: body.checksum,
    }), { expiresIn: 300 })
    return json(200, { fileId: data.id, url, expiresIn: 300 })
  } catch (error) {
    return handleError(error)
  }
}
