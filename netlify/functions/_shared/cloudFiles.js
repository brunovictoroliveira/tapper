export const MAX_FILE_BYTES = 100 * 1024 * 1024
export const MIME_EXTENSIONS = new Map([
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/webm', 'webm'],
  ['audio/ogg', 'ogg'],
])

export function validateUpload({ songId, originalName, mimeType, sizeBytes, checksum }) {
  if (!/^[0-9a-f-]{36}$/i.test(songId || '') || typeof originalName !== 'string' || !originalName.trim()) throw new Error('invalid_file')
  if (!MIME_EXTENSIONS.has(mimeType)) throw new Error('unsupported_mime_type')
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) throw new Error('invalid_file')
  if (sizeBytes > MAX_FILE_BYTES) throw new Error('file_too_large')
  if (!/^[A-Za-z0-9+/]{43}=$/.test(checksum || '')) throw new Error('invalid_file')
  return { extension: MIME_EXTENSIONS.get(mimeType), originalName: originalName.trim().slice(0, 255) }
}
