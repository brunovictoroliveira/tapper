import { createSongAnalysis } from '../models/createSongAnalysis.js'

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]
const CAMELOT_MAJOR = ['8B', '3B', '10B', '5B', '12B', '7B', '2B', '9B', '4B', '11B', '6B', '1B']
const CAMELOT_MINOR = ['5A', '12A', '7A', '2A', '9A', '4A', '11A', '6A', '1A', '8A', '3A', '10A']
const FFT_SIZE = 8192
const MAX_ANALYSIS_SECONDS = 180
const MAX_FRAMES = 120

export class KeyDetectionError extends Error {
  constructor(message) {
    super(message)
    this.name = 'KeyDetectionError'
  }
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Análise cancelada.', 'AbortError')
}

function report(onProgress, progress, stage) {
  onProgress?.(progress, stage)
}

function correlation(left, right) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length
  let numerator = 0
  let leftSquareSum = 0
  let rightSquareSum = 0

  for (let index = 0; index < left.length; index += 1) {
    const centeredLeft = left[index] - leftMean
    const centeredRight = right[index] - rightMean
    numerator += centeredLeft * centeredRight
    leftSquareSum += centeredLeft ** 2
    rightSquareSum += centeredRight ** 2
  }

  const denominator = Math.sqrt(leftSquareSum * rightSquareSum)
  return denominator ? numerator / denominator : 0
}

function rotateProfile(profile, positions) {
  return profile.map((_, index) => profile[(index - positions + profile.length) % profile.length])
}

export function rankKeyCandidates(chroma) {
  const candidates = []

  NOTES.forEach((key, keyIndex) => {
    ;[
      ['major', MAJOR_PROFILE, CAMELOT_MAJOR[keyIndex]],
      ['minor', MINOR_PROFILE, CAMELOT_MINOR[keyIndex]],
    ].forEach(([mode, profile, camelot]) => {
      candidates.push({
        key,
        mode,
        camelot,
        display: `${key} ${mode === 'major' ? 'maior' : 'menor'}`,
        score: correlation(chroma, rotateProfile(profile, keyIndex)),
      })
    })
  })

  return candidates.sort((left, right) => right.score - left.score)
}

function fft(real, imaginary) {
  const size = real.length

  for (let index = 1, reversed = 0; index < size; index += 1) {
    let bit = size >> 1
    while (reversed & bit) {
      reversed ^= bit
      bit >>= 1
    }
    reversed ^= bit
    if (index < reversed) {
      ;[real[index], real[reversed]] = [real[reversed], real[index]]
      ;[imaginary[index], imaginary[reversed]] = [imaginary[reversed], imaginary[index]]
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = -2 * Math.PI / length
    const stepReal = Math.cos(angle)
    const stepImaginary = Math.sin(angle)

    for (let offset = 0; offset < size; offset += length) {
      let phaseReal = 1
      let phaseImaginary = 0
      for (let index = 0; index < length / 2; index += 1) {
        const even = offset + index
        const odd = even + length / 2
        const oddReal = real[odd] * phaseReal - imaginary[odd] * phaseImaginary
        const oddImaginary = real[odd] * phaseImaginary + imaginary[odd] * phaseReal
        real[odd] = real[even] - oddReal
        imaginary[odd] = imaginary[even] - oddImaginary
        real[even] += oddReal
        imaginary[even] += oddImaginary
        const nextPhaseReal = phaseReal * stepReal - phaseImaginary * stepImaginary
        phaseImaginary = phaseReal * stepImaginary + phaseImaginary * stepReal
        phaseReal = nextPhaseReal
      }
    }
  }
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor((sorted.length - 1) * fraction)] ?? 0
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function createFrameOffsets(sampleCount) {
  const usableSamples = sampleCount - FFT_SIZE
  if (usableSamples <= 0) return []
  const frameCount = Math.min(MAX_FRAMES, Math.floor(usableSamples / (FFT_SIZE / 2)) + 1)
  if (frameCount === 1) return [0]
  return Array.from({ length: frameCount }, (_, index) => (
    Math.floor((usableSamples * index) / (frameCount - 1))
  ))
}

async function buildChroma(audioBuffer, signal, onProgress) {
  const sampleCount = Math.min(audioBuffer.length, Math.floor(audioBuffer.sampleRate * MAX_ANALYSIS_SECONDS))
  const offsets = createFrameOffsets(sampleCount)
  const channels = Array.from(
    { length: audioBuffer.numberOfChannels },
    (_, index) => audioBuffer.getChannelData(index),
  )
  const window = Float64Array.from(
    { length: FFT_SIZE },
    (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (FFT_SIZE - 1)),
  )
  const frames = []
  const energies = []

  for (let frameIndex = 0; frameIndex < offsets.length; frameIndex += 1) {
    throwIfAborted(signal)
    const offset = offsets[frameIndex]
    const real = new Float64Array(FFT_SIZE)
    const imaginary = new Float64Array(FFT_SIZE)
    let energy = 0

    for (let index = 0; index < FFT_SIZE; index += 1) {
      let sample = 0
      for (const channel of channels) sample += channel[offset + index] || 0
      sample /= channels.length
      real[index] = sample * window[index]
      energy += sample * sample
    }

    fft(real, imaginary)
    const chroma = new Float64Array(12)
    const minimumBin = Math.ceil((55 * FFT_SIZE) / audioBuffer.sampleRate)
    const maximumBin = Math.min(FFT_SIZE / 2, Math.floor((5000 * FFT_SIZE) / audioBuffer.sampleRate))

    for (let bin = minimumBin; bin <= maximumBin; bin += 1) {
      const frequency = (bin * audioBuffer.sampleRate) / FFT_SIZE
      const midiNote = Math.round(69 + 12 * Math.log2(frequency / 440))
      const pitchClass = ((midiNote % 12) + 12) % 12
      chroma[pitchClass] += Math.hypot(real[bin], imaginary[bin])
    }

    const chromaSum = chroma.reduce((sum, value) => sum + value, 0)
    if (chromaSum) {
      for (let index = 0; index < chroma.length; index += 1) chroma[index] /= chromaSum
    }
    frames.push(chroma)
    energies.push(energy / FFT_SIZE)

    if (frameIndex % 8 === 0) {
      report(onProgress, 24 + Math.round((frameIndex / offsets.length) * 62), 'Calculando o perfil harmônico')
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  const energyFloor = percentile(energies, 0.2)
  const activeFrames = frames.filter((_, index) => energies[index] > energyFloor && energies[index] > 1e-8)
  if (!activeFrames.length) throw new KeyDetectionError('A amostra não contém áudio suficiente para análise.')

  const chroma = Array.from({ length: 12 }, (_, noteIndex) => (
    median(activeFrames.map((frame) => frame[noteIndex]))
  ))
  const total = chroma.reduce((sum, value) => sum + value, 0) || 1
  return chroma.map((value) => value / total)
}

async function decodeFile(file, signal, onProgress) {
  const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AudioContextClass) throw new KeyDetectionError('Este navegador não oferece suporte à análise local de áudio.')

  report(onProgress, 4, 'Lendo o arquivo local')
  const encodedAudio = await file.arrayBuffer()
  throwIfAborted(signal)
  report(onProgress, 12, 'Decodificando o áudio')
  const audioContext = new AudioContextClass()
  try {
    return await audioContext.decodeAudioData(encodedAudio)
  } catch {
    throw new KeyDetectionError('Formato de áudio inválido, corrompido ou não suportado pelo navegador.')
  } finally {
    await audioContext.close()
  }
}

export async function detectKey(source, { signal, onProgress } = {}) {
  throwIfAborted(signal)
  const isAudioBuffer = typeof AudioBuffer !== 'undefined' && source instanceof AudioBuffer
  if (!(source instanceof Blob) && !isAudioBuffer) {
    throw new TypeError('detectKey espera receber um arquivo de áudio ou AudioBuffer.')
  }

  const audioBuffer = isAudioBuffer ? source : await decodeFile(source, signal, onProgress)
  const durationSeconds = Math.min(audioBuffer.duration, MAX_ANALYSIS_SECONDS)
  if (durationSeconds < 4) throw new KeyDetectionError('Use uma amostra com pelo menos 4 segundos de música audível.')

  report(onProgress, 22, 'Preparando a análise local')
  const chroma = await buildChroma(audioBuffer, signal, onProgress)
  throwIfAborted(signal)
  report(onProgress, 92, 'Comparando as tonalidades')
  const [best, alternative] = rankKeyCandidates(chroma)
  const quality = Math.max(0, Math.min(1, (best.score + 1) / 2))
  const separation = Math.max(0, best.score - alternative.score)
  const confidence = Math.max(0.35, Math.min(0.97, 0.30 + 0.48 * quality + 1.4 * separation))

  report(onProgress, 100, 'Análise concluída')
  return createSongAnalysis({
    key: best.key,
    mode: best.mode,
    confidence,
    durationMs: durationSeconds * 1000,
    camelot: best.camelot,
    alternative: {
      key: alternative.key,
      mode: alternative.mode,
      display: alternative.display,
      camelot: alternative.camelot,
    },
  })
}
