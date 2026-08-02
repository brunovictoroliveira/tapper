import { cloudProjectRepository } from '../repositories/cloudProjectRepository.js'
import { cloudSongRepository } from '../repositories/cloudSongRepository.js'
import { localProjectRepository } from '../repositories/localProjectRepository.js'
import { localSongRepository } from '../repositories/localSongRepository.js'
import { getEntitlement } from './entitlementService.js'

function cloudSongInput(song) {
  return {
    clientReference: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    originalFilename: song.originalFilename,
    mimeType: song.mimeType,
    fileSizeBytes: song.fileSizeBytes,
    durationMs: song.durationMs,
    detectedKey: song.detectedKey,
    detectedMode: song.detectedMode,
    detectionConfidence: song.detectionConfidence,
    manualKey: song.manualKey,
    bpm: song.bpm,
    notes: song.notes,
    tags: song.tags,
    analyzedAt: song.analyzedAt,
  }
}

export async function syncLocalLibrary({ onProgress } = {}) {
  const entitlement = await getEntitlement()
  if (!entitlement.authenticated) throw new Error('Entre na sua conta para sincronizar.')
  if (!entitlement.canWriteCloud) throw new Error('Uma assinatura ativa é necessária para sincronizar.')

  const songs = await localSongRepository.list()
  const projects = await localProjectRepository.list()
  const pendingSongs = songs.filter((song) => song.syncStatus !== 'synced' || !song.cloudId)
  const pendingProjects = projects.filter((project) => project.syncStatus !== 'synced' || !project.cloudId)
  const total = pendingSongs.length + pendingProjects.length
  let completed = 0
  let failures = 0

  for (const song of pendingSongs) {
    try {
      await localSongRepository.update(song.id, { syncStatus: 'pending', syncError: '' })
      const cloudSong = await cloudSongRepository.create(cloudSongInput(song))
      song.cloudId = cloudSong.id
      await localSongRepository.update(song.id, { cloudId: cloudSong.id, syncStatus: 'synced', syncError: '' })
    } catch (error) {
      failures += 1
      await localSongRepository.update(song.id, { syncStatus: 'pending', syncError: error.message })
    }
    completed += 1
    onProgress?.({ completed, total, failures })
  }

  const refreshedSongs = await localSongRepository.list()
  const cloudSongIds = new Map(refreshedSongs.map((song) => [song.id, song.cloudId]))
  for (const project of pendingProjects) {
    try {
      await localProjectRepository.update(project.id, { syncStatus: 'pending', syncError: '' })
      if (project.songId && !cloudSongIds.get(project.songId)) {
        throw new Error('A música relacionada ainda não foi sincronizada.')
      }
      const cloudProject = await cloudProjectRepository.create({
        clientReference: project.id,
        songId: project.songId ? cloudSongIds.get(project.songId) || null : null,
        name: project.name,
        projectState: project.projectState,
      })
      await localProjectRepository.update(project.id, { cloudId: cloudProject.id, syncStatus: 'synced', syncError: '' })
    } catch (error) {
      failures += 1
      await localProjectRepository.update(project.id, { syncStatus: 'pending', syncError: error.message })
    }
    completed += 1
    onProgress?.({ completed, total, failures })
  }

  return { total, completed, failures }
}
