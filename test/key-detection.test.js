import assert from 'node:assert/strict'
import test from 'node:test'
import { createSongAnalysis } from '../src/features/key-detection/models/createSongAnalysis.js'
import { rankKeyCandidates } from '../src/features/key-detection/services/detectKey.js'

const C_MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]

test('identifica o perfil de Dó maior', () => {
  const [candidate] = rankKeyCandidates(C_MAJOR_PROFILE)
  assert.equal(candidate.key, 'C')
  assert.equal(candidate.mode, 'major')
  assert.equal(candidate.camelot, '8B')
})

test('respeita a rotação do perfil para Lá menor', () => {
  const aMinorProfile = [5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17, 6.33, 2.68, 3.52]
  const [candidate] = rankKeyCandidates(aMinorProfile)
  assert.equal(candidate.key, 'A')
  assert.equal(candidate.mode, 'minor')
  assert.equal(candidate.camelot, '8A')
})

test('normaliza o contrato de análise', () => {
  const analysis = createSongAnalysis({
    key: ' F# ',
    mode: 'minor',
    confidence: 2,
    durationMs: 214000.4,
  })

  assert.equal(analysis.key, 'F#')
  assert.equal(analysis.mode, 'minor')
  assert.equal(analysis.confidence, 1)
  assert.equal(analysis.durationMs, 214000)
  assert.ok(Object.isFrozen(analysis))
})

test('recusa modos tonais fora do contrato', () => {
  assert.throws(
    () => createSongAnalysis({ key: 'C', mode: 'dorian' }),
    /Modo tonal inválido/,
  )
})
