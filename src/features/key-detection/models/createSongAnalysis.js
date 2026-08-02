const VALID_MODES = new Set(['major', 'minor', 'unknown'])

export function createSongAnalysis({
  key,
  mode = 'unknown',
  confidence = 0,
  durationMs = 0,
  camelot = null,
  alternative = null,
  analysisVersion = 'browser-chroma-1',
}) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new TypeError('A tonalidade detectada precisa ser informada.')
  }

  if (!VALID_MODES.has(mode)) {
    throw new TypeError(`Modo tonal inválido: ${mode}`)
  }

  return Object.freeze({
    key: key.trim(),
    mode,
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0)),
    durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
    camelot,
    alternative,
    analysisVersion,
    analyzedAt: new Date().toISOString(),
  })
}
