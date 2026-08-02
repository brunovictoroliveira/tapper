import assert from 'node:assert/strict'
import test from 'node:test'
import { MAX_FILE_BYTES, validateUpload } from '../netlify/functions/_shared/cloudFiles.js'
import { handler as createUploadUrl } from '../netlify/functions/create-upload-url.js'

const validUpload = {
  songId: '123e4567-e89b-12d3-a456-426614174000',
  originalName: 'faixa.wav',
  mimeType: 'audio/wav',
  sizeBytes: 1024,
  checksum: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
}

test('valida metadados permitidos para upload R2', () => {
  assert.equal(validateUpload(validUpload).extension, 'wav')
  assert.throws(() => validateUpload({ ...validUpload, sizeBytes: MAX_FILE_BYTES + 1 }), /file_too_large/)
  assert.throws(() => validateUpload({ ...validUpload, mimeType: 'text/html' }), /unsupported_mime_type/)
  assert.throws(() => validateUpload({ ...validUpload, songId: '../../admin' }), /invalid_file/)
})

test('Functions recusam métodos inesperados antes de acessar segredos', async () => {
  const response = await createUploadUrl({ httpMethod: 'GET', headers: {} })
  assert.equal(response.statusCode, 405)
  assert.equal(response.headers.allow, 'POST')
})
