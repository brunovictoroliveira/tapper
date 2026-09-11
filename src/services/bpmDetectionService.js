const MIN_BPM = 60
const MAX_BPM = 200

function getAudioContext() {
  const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!AudioContext) throw new Error('Seu navegador não oferece suporte à análise de áudio.')
  return new AudioContext()
}

export function calculateTapBpm(taps) {
  if (taps.length < 2) return null
  const intervals = taps.slice(1).map((tap, index) => tap - taps[index]).filter((interval) => interval > 0)
  if (!intervals.length) return null
  const ordered = intervals.toSorted((left, right) => left - right)
  const trim = intervals.length >= 5 ? Math.max(1, Math.floor(intervals.length * 0.1)) : 0
  const samples = trim ? ordered.slice(trim, -trim) : ordered
  return Math.round(600000 / (samples.reduce((sum, value) => sum + value, 0) / samples.length)) / 10
}

function monoSamples(buffer) {
  const samples = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const values = buffer.getChannelData(channel)
    for (let index = 0; index < values.length; index += 1) samples[index] += values[index] / buffer.numberOfChannels
  }
  return samples
}

function onsetEnvelope(samples, sampleRate) {
  const windowSize = 1024
  const hop = 512
  const limit = Math.min(samples.length, sampleRate * 180)
  const envelope = []
  let previousEnergy = 0
  for (let start = 0; start + windowSize <= limit; start += hop) {
    let energy = 0
    for (let offset = 0; offset < windowSize; offset += 1) energy += Math.abs(samples[start + offset])
    const currentEnergy = energy / windowSize
    envelope.push(Math.max(0, currentEnergy - previousEnergy))
    previousEnergy = currentEnergy
  }
  return { envelope, framesPerSecond: sampleRate / hop }
}

export function estimateBpmFromEnvelope(envelope, framesPerSecond) {
  if (envelope.length < framesPerSecond * 3) throw new Error('A faixa é curta demais para estimar o BPM.')
  const average = envelope.reduce((sum, value) => sum + value, 0) / envelope.length
  const normalized = envelope.map((value) => Math.max(0, value - average))
  const shortestLag = Math.round((60 * framesPerSecond) / MAX_BPM)
  const longestLag = Math.round((60 * framesPerSecond) / MIN_BPM)
  let winner = { lag: 0, score: -Infinity }
  let total = 0
  for (let lag = shortestLag; lag <= longestLag; lag += 1) {
    let score = 0
    for (let index = lag; index < normalized.length; index += 1) score += normalized[index] * normalized[index - lag]
    total += score
    if (score > winner.score) winner = { lag, score }
  }
  const confidence = total > 0 ? Math.min(0.99, winner.score / total * (longestLag - shortestLag + 1)) : 0
  return { bpm: Math.round(600 * framesPerSecond / winner.lag) / 10, confidence }
}

export async function detectBpm(file, { onProgress } = {}) {
  if (!(file instanceof Blob)) throw new TypeError('Escolha um arquivo de áudio para detectar o BPM.')
  const context = getAudioContext()
  try {
    onProgress?.('Lendo o áudio…')
    const buffer = await context.decodeAudioData(await file.arrayBuffer())
    onProgress?.('Identificando pulsos…')
    const { envelope, framesPerSecond } = onsetEnvelope(monoSamples(buffer), buffer.sampleRate)
    onProgress?.('Calculando o andamento…')
    const result = estimateBpmFromEnvelope(envelope, framesPerSecond)
    return { ...result, durationMs: Math.round(buffer.duration * 1000) }
  } catch (error) {
    throw new Error(error.message || 'Não foi possível analisar o BPM deste áudio.')
  } finally {
    await context.close()
  }
}
