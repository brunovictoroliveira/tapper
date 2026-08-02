import { localProjectRepository } from '../repositories/localProjectRepository.js'

export async function createProjectFromAnalysis(song, analysis) {
  return localProjectRepository.create({
    songId: song.id,
    name: song.title,
    projectState: {
      selectedKey: analysis.key,
      detectedKey: analysis.key,
      detectedMode: analysis.mode,
      confidence: analysis.confidence,
      bpm: song.bpm,
      transpose: 0,
      loop: null,
      markers: [],
      zoom: 1,
      playhead: 0,
    },
  })
}
