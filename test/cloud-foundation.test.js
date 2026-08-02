import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  fromCloudSongRow,
  toCloudSongRow,
} from '../src/repositories/cloudSongRepository.js'

test('mapeia somente campos permitidos em atualizações cloud', () => {
  assert.deepEqual(toCloudSongRow({ notes: 'Nova nota', bpm: null, audioFileId: 'admin-only' }), {
    notes: 'Nova nota',
    bpm: null,
  })
})

test('converte linhas Supabase para o contrato comum', () => {
  const song = fromCloudSongRow({
    id: 'song-1',
    user_id: 'user-1',
    title: 'Faixa',
    artist: '',
    album: '',
    original_filename: 'faixa.wav',
    mime_type: 'audio/wav',
    file_size_bytes: 10,
    duration_ms: 1000,
    detected_key: 'F#',
    detected_mode: 'minor',
    detection_confidence: '0.83',
    manual_key: '',
    bpm: '92.5',
    notes: '',
    tags: [],
    audio_file_id: null,
    analyzed_at: '2026-08-02T00:00:00Z',
    created_at: '2026-08-02T00:00:00Z',
    updated_at: '2026-08-02T00:00:00Z',
  })

  assert.equal(song.detectedKey, 'F#')
  assert.equal(song.detectionConfidence, 0.83)
  assert.equal(song.bpm, 92.5)
  assert.equal(song.syncStatus, 'synced')
})

test('migration inicial ativa RLS em todas as tabelas expostas', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/202608020001_initial_cloud_schema.sql', import.meta.url),
    'utf8',
  )

  for (const table of ['profiles', 'subscriptions', 'songs', 'projects', 'project_versions', 'cloud_files', 'payment_events']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`))
  }
  assert.match(migration, /private\.has_cloud_write_access/)
  assert.match(migration, /private\.owns_song/)
  assert.doesNotMatch(migration, /grant insert, update, delete on public\.songs/)
  assert.match(migration, /limit 5/)
})

test('operações de arquivo ficam restritas à service role', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/202608020002_cloud_file_operations.sql', import.meta.url),
    'utf8',
  )
  for (const operation of ['reserve_cloud_file', 'finalize_cloud_file', 'delete_cloud_file_record']) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${operation}`))
    assert.match(migration, new RegExp(`grant execute on function public\\.${operation}[^;]+to service_role;`, 's'))
  }
  assert.doesNotMatch(migration, /to authenticated;/)
})
