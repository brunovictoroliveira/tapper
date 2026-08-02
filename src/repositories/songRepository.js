import { localSongRepository } from './localSongRepository.js'

let activeRepository = localSongRepository

export const songRepository = {
  create: (...arguments_) => activeRepository.create(...arguments_),
  findById: (...arguments_) => activeRepository.findById(...arguments_),
  list: (...arguments_) => activeRepository.list(...arguments_),
  update: (...arguments_) => activeRepository.update(...arguments_),
  remove: (...arguments_) => activeRepository.remove(...arguments_),
  upsertMany: (...arguments_) => activeRepository.upsertMany(...arguments_),
}

export function useSongRepository(repository) {
  activeRepository = repository || localSongRepository
}
