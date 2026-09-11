import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateTapBpm, estimateBpmFromEnvelope } from '../src/services/bpmDetectionService.js'

test('calcula BPM manual a partir dos intervalos entre toques', () => {
  assert.equal(calculateTapBpm([0, 500, 1000, 1500, 2000]), 120)
})

test('identifica a periodicidade dominante no envelope de pulsos', () => {
  const framesPerSecond = 100
  const envelope = Array.from({ length: 1200 }, (_, index) => index % 50 === 0 ? 1 : 0)
  const result = estimateBpmFromEnvelope(envelope, framesPerSecond)
  assert.equal(result.bpm, 120)
  assert.ok(result.confidence > 0)
})
