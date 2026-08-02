import assert from 'node:assert/strict'
import test from 'node:test'
import 'fake-indexeddb/auto'

test('executa CRUD local, projeto e remoção em cascata no IndexedDB', async () => {
  const { localSongRepository } = await import('../src/repositories/localSongRepository.js')
  const { localProjectRepository } = await import('../src/repositories/localProjectRepository.js')

  const song = await localSongRepository.create({
    title: 'Teste IndexedDB',
    detectedKey: 'G',
    detectedMode: 'major',
  })
  const project = await localProjectRepository.create({
    songId: song.id,
    name: song.title,
    projectState: { detectedKey: 'G' },
  })

  assert.equal((await localSongRepository.findById(song.id)).title, 'Teste IndexedDB')
  assert.equal((await localProjectRepository.findById(project.id)).songId, song.id)

  const updated = await localSongRepository.update(song.id, { notes: 'Nota persistida' })
  assert.equal(updated.notes, 'Nota persistida')
  assert.equal((await localSongRepository.list({ search: 'indexeddb' })).length, 1)

  await localSongRepository.remove(song.id)
  assert.equal(await localSongRepository.findById(song.id), undefined)
  assert.equal(await localProjectRepository.findById(project.id), undefined)
})

test('restaura músicas e projetos a partir de backup JSON', async () => {
  const { localSongRepository } = await import('../src/repositories/localSongRepository.js')
  const { localProjectRepository } = await import('../src/repositories/localProjectRepository.js')
  const { importLocalData, serializeBackup } = await import('../src/services/localBackupService.js')

  const contents = serializeBackup({
    songs: [{ id: 'imported-song', title: 'Importada', detectedKey: 'A', syncStatus: 'local' }],
    projects: [{ id: 'imported-project', songId: 'imported-song', name: 'Importado', projectState: {} }],
  })
  const result = await importLocalData(contents)

  assert.deepEqual(result, { songs: 1, projects: 1 })
  assert.equal((await localSongRepository.findById('imported-song')).title, 'Importada')
  assert.equal((await localProjectRepository.findById('imported-project')).songId, 'imported-song')
})
