import { runTransaction } from '../storage/tapperDatabase.js'

const SYNC_STATUSES = new Set(['local', 'pending', 'synced', 'conflict'])

function createId() {
  return globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeLocalSong(song, existing = null) {
  const timestamp = new Date().toISOString()
  const syncStatus = song.syncStatus || existing?.syncStatus || 'local'
  if (!SYNC_STATUSES.has(syncStatus)) throw new TypeError(`Status de sincronização inválido: ${syncStatus}`)

  return {
    id: existing?.id || song.id || createId(),
    cloudId: song.cloudId || existing?.cloudId || null,
    title: text(song.title) || 'Sem título',
    artist: text(song.artist),
    album: text(song.album),
    originalFilename: text(song.originalFilename),
    mimeType: text(song.mimeType),
    fileSizeBytes: Math.max(0, Number(song.fileSizeBytes) || 0),
    durationMs: Math.max(0, Math.round(Number(song.durationMs) || 0)),
    detectedKey: text(song.detectedKey),
    detectedMode: song.detectedMode || 'unknown',
    detectionConfidence: Math.max(0, Math.min(1, Number(song.detectionConfidence) || 0)),
    manualKey: text(song.manualKey),
    camelot: text(song.camelot),
    alternative: song.alternative || null,
    bpm: song.bpm == null ? null : Number(song.bpm),
    notes: text(song.notes),
    tags: Array.isArray(song.tags) ? song.tags.map(text).filter(Boolean) : [],
    analyzedAt: song.analyzedAt || existing?.analyzedAt || timestamp,
    syncStatus,
    syncError: text(song.syncError),
    createdAt: existing?.createdAt || song.createdAt || timestamp,
    updatedAt: timestamp,
  }
}

function matchesFilters(song, filters) {
  const query = text(filters.search).toLocaleLowerCase('pt-BR')
  if (query && !`${song.title} ${song.artist}`.toLocaleLowerCase('pt-BR').includes(query)) return false
  if (filters.key && song.manualKey !== filters.key && song.detectedKey !== filters.key) return false
  if (filters.syncStatus && song.syncStatus !== filters.syncStatus) return false
  return true
}

export const localSongRepository = {
  async create(song) {
    const record = normalizeLocalSong(song)
    await runTransaction(['songs'], 'readwrite', (transaction) => {
      transaction.objectStore('songs').add(record)
    })
    return record
  },

  async findById(id) {
    return runTransaction(['songs'], 'readonly', (transaction, toPromise) => (
      toPromise(transaction.objectStore('songs').get(id))
    ))
  },

  async list(filters = {}) {
    const songs = await runTransaction(['songs'], 'readonly', (transaction, toPromise) => (
      toPromise(transaction.objectStore('songs').getAll())
    ))
    return songs
      .filter((song) => matchesFilters(song, filters))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  },

  async update(id, changes) {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Música não encontrada no histórico local.')
    const record = normalizeLocalSong({ ...existing, ...changes }, existing)
    await runTransaction(['songs'], 'readwrite', (transaction) => {
      transaction.objectStore('songs').put(record)
    })
    return record
  },

  async remove(id) {
    await runTransaction(['songs', 'projects', 'blobs'], 'readwrite', (transaction) => {
      transaction.objectStore('songs').delete(id)
      const projects = transaction.objectStore('projects').index('song_id').openCursor(id)
      projects.onsuccess = () => {
        const cursor = projects.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      const blobs = transaction.objectStore('blobs').index('song_id').openCursor(id)
      blobs.onsuccess = () => {
        const cursor = blobs.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
    })
  },

  async upsertMany(songs) {
    await runTransaction(['songs'], 'readwrite', (transaction) => {
      const store = transaction.objectStore('songs')
      songs.forEach((song) => store.put(normalizeLocalSong(song)))
    })
  },
}
