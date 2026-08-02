import { getSupabaseClient } from '../lib/supabaseClient.js'

export function fromCloudSongRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    clientReference: row.client_reference,
    title: row.title,
    artist: row.artist,
    album: row.album,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    durationMs: row.duration_ms,
    detectedKey: row.detected_key,
    detectedMode: row.detected_mode,
    detectionConfidence: Number(row.detection_confidence),
    manualKey: row.manual_key,
    bpm: row.bpm == null ? null : Number(row.bpm),
    notes: row.notes,
    tags: row.tags || [],
    audioFileId: row.audio_file_id,
    analyzedAt: row.analyzed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
  }
}

const COLUMN_MAP = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  originalFilename: 'original_filename',
  mimeType: 'mime_type',
  fileSizeBytes: 'file_size_bytes',
  durationMs: 'duration_ms',
  detectedKey: 'detected_key',
  detectedMode: 'detected_mode',
  detectionConfidence: 'detection_confidence',
  manualKey: 'manual_key',
  bpm: 'bpm',
  notes: 'notes',
  tags: 'tags',
  analyzedAt: 'analyzed_at',
}

export function toCloudSongRow(song) {
  return Object.fromEntries(Object.entries(COLUMN_MAP)
    .filter(([property]) => song[property] !== undefined)
    .map(([property, column]) => [column, song[property]]))
}

async function currentUserId() {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
  if (!data.session?.user) throw new Error('Entre na sua conta para usar o Tapper Cloud.')
  return data.session.user.id
}

function unwrap(result) {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

function safeSearch(value) {
  return String(value).replace(/[,().%_'"\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

export const cloudSongRepository = {
  async create(song) {
    const userId = await currentUserId()
    if (song.clientReference) {
      const existing = unwrap(await getSupabaseClient()
        .from('songs')
        .select('*')
        .eq('client_reference', song.clientReference)
        .maybeSingle())
      if (existing) return fromCloudSongRow(existing)
    }
    const data = unwrap(await getSupabaseClient()
      .from('songs')
      .insert({
        artist: '',
        album: '',
        original_filename: '',
        mime_type: '',
        file_size_bytes: 0,
        duration_ms: 0,
        detected_key: '',
        detected_mode: 'unknown',
        detection_confidence: 0,
        manual_key: '',
        notes: '',
        tags: [],
        ...toCloudSongRow(song),
        user_id: userId,
        client_reference: song.clientReference || null,
      })
      .select()
      .single())
    return fromCloudSongRow(data)
  },

  async findById(id) {
    const data = unwrap(await getSupabaseClient().from('songs').select('*').eq('id', id).maybeSingle())
    return fromCloudSongRow(data)
  },

  async list(filters = {}) {
    let query = getSupabaseClient().from('songs').select('*').order('updated_at', { ascending: false })
    const search = safeSearch(filters.search || '')
    if (search) query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`)
    if (filters.key) query = query.eq('detected_key', filters.key)
    const data = unwrap(await query.limit(filters.limit || 500))
    return data.map(fromCloudSongRow)
  },

  async update(id, changes) {
    const data = unwrap(await getSupabaseClient()
      .from('songs')
      .update(toCloudSongRow(changes))
      .eq('id', id)
      .select()
      .single())
    return fromCloudSongRow(data)
  },

  async remove(id) {
    unwrap(await getSupabaseClient().from('songs').delete().eq('id', id))
  },
}
