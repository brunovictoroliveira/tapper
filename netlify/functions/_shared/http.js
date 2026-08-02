const DEFAULT_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

export function json(statusCode, body) {
  return { statusCode, headers: DEFAULT_HEADERS, body: JSON.stringify(body) }
}

export function methodNotAllowed(allowed = 'POST') {
  return { ...json(405, { error: 'method_not_allowed' }), headers: { ...DEFAULT_HEADERS, allow: allowed } }
}

export function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}')
  } catch {
    throw new Error('invalid_json')
  }
}

export function handleError(error) {
  const publicErrors = new Set([
    'invalid_json', 'unauthorized', 'premium_required', 'invalid_file', 'file_too_large',
    'unsupported_mime_type', 'storage_quota_exceeded', 'song_not_found', 'file_not_found',
    'upload_not_found', 'checksum_mismatch', 'size_mismatch',
    'subscription_already_active', 'invalid_signature',
    'invalid_account_deletion_confirmation',
  ])
  const code = publicErrors.has(error.message) ? error.message : 'internal_error'
  const status = code === 'unauthorized' ? 401
    : code === 'premium_required' ? 403
      : code === 'file_not_found' || code === 'song_not_found' ? 404
        : code === 'internal_error' ? 500 : 400
  if (code === 'internal_error') console.error(error)
  return json(status, { error: code })
}
