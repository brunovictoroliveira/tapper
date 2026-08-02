import { localProjectRepository } from '../repositories/localProjectRepository.js'
import { localSongRepository } from '../repositories/localSongRepository.js'

export const BACKUP_FORMAT = 'tapper-local-backup'
export const BACKUP_VERSION = 1

export function serializeBackup({ songs, projects, exportedAt = new Date().toISOString() }) {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    songs,
    projects,
  }, null, 2)
}

export function parseBackup(contents) {
  let backup
  try {
    backup = JSON.parse(contents)
  } catch {
    throw new Error('O arquivo selecionado não contém JSON válido.')
  }

  if (backup?.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    throw new Error('Este arquivo não é um backup compatível do Tapper.')
  }
  if (!Array.isArray(backup.songs) || !Array.isArray(backup.projects)) {
    throw new Error('O backup está incompleto ou corrompido.')
  }

  return backup
}

export async function exportLocalData() {
  const [songs, projects] = await Promise.all([
    localSongRepository.list(),
    localProjectRepository.list(),
  ])
  return serializeBackup({ songs, projects })
}

export async function importLocalData(contents) {
  const backup = parseBackup(contents)
  await localSongRepository.upsertMany(backup.songs)
  await localProjectRepository.upsertMany(backup.projects)
  return { songs: backup.songs.length, projects: backup.projects.length }
}
