import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeLocalProject } from '../src/repositories/localProjectRepository.js'
import { normalizeLocalSong } from '../src/repositories/localSongRepository.js'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  parseBackup,
  serializeBackup,
} from '../src/services/localBackupService.js'

test('normaliza uma música local com estado inicial de sincronização', () => {
  const song = normalizeLocalSong({
    title: '  Minha faixa  ',
    detectedKey: 'C#',
    detectedMode: 'minor',
    detectionConfidence: 1.4,
    tags: [' demo ', '', 'referência'],
  })

  assert.ok(song.id)
  assert.equal(song.title, 'Minha faixa')
  assert.equal(song.syncStatus, 'local')
  assert.equal(song.detectionConfidence, 1)
  assert.deepEqual(song.tags, ['demo', 'referência'])
})

test('preserva identidade e criação ao atualizar uma música', () => {
  const existing = normalizeLocalSong({ id: 'song-1', title: 'Antes' })
  const updated = normalizeLocalSong({ ...existing, title: 'Depois' }, existing)

  assert.equal(updated.id, existing.id)
  assert.equal(updated.createdAt, existing.createdAt)
  assert.equal(updated.title, 'Depois')
})

test('cria estado restaurável de projeto local', () => {
  const project = normalizeLocalProject({
    songId: 'song-1',
    name: 'Projeto',
    projectState: { selectedKey: 'Am', playhead: 12.4 },
  })

  assert.equal(project.version, 1)
  assert.equal(project.syncStatus, 'local')
  assert.equal(project.projectState.playhead, 12.4)
})

test('exporta e lê o formato versionado de backup', () => {
  const contents = serializeBackup({ songs: [{ id: 'song-1' }], projects: [] })
  const backup = parseBackup(contents)

  assert.equal(backup.format, BACKUP_FORMAT)
  assert.equal(backup.version, BACKUP_VERSION)
  assert.equal(backup.songs[0].id, 'song-1')
})

test('recusa arquivos JSON que não sejam backups do Tapper', () => {
  assert.throws(() => parseBackup('{"songs":[]}'), /não é um backup compatível/)
  assert.throws(() => parseBackup('não-json'), /não contém JSON válido/)
})
