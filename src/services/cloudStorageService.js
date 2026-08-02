import { getSupabaseClient } from '../lib/supabaseClient.js'

async function accessToken() {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
  if (!data.session?.access_token) throw new Error('Entre na sua conta para usar arquivos na nuvem.')
  return data.session.access_token
}

async function callFunction(name, body) {
  const response = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}` },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Falha ao acessar o armazenamento em nuvem.')
  return result
}

async function sha256Base64(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  const bytes = new Uint8Array(digest)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export const cloudStorageService = {
  async uploadSongAudio(songId, file, onProgress) {
    const checksum = await sha256Base64(file)
    const reservation = await callFunction('create-upload-url', {
      songId,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      checksum,
    })
    await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open('PUT', reservation.url)
      request.setRequestHeader('Content-Type', file.type)
      request.setRequestHeader('x-amz-checksum-sha256', checksum)
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress?.(event.loaded / event.total)
      }
      request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('O upload para o R2 falhou.'))
      request.onerror = () => reject(new Error('Não foi possível conectar ao armazenamento R2.'))
      request.send(file)
    })
    return callFunction('finalize-upload', { fileId: reservation.fileId })
  },

  async createDownloadUrl(fileId) {
    return (await callFunction('create-download-url', { fileId })).url
  },

  async remove(fileId) {
    return callFunction('delete-cloud-file', { fileId })
  },
}
