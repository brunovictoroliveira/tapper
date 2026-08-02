import { useCallback, useEffect, useRef, useState } from 'react'
import { detectKey } from '../services/detectKey.js'

const INITIAL_PROGRESS = { value: 0, stage: 'Pronto para analisar' }

export function useKeyDetection() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(INITIAL_PROGRESS)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const cancel = useCallback(() => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    cancel()
    setStatus('idle')
    setProgress(INITIAL_PROGRESS)
    setResult(null)
    setError('')
  }, [cancel])

  const restore = useCallback((analysis) => {
    cancel()
    setResult(analysis)
    setStatus('done')
    setProgress({ value: 100, stage: 'Projeto restaurado' })
    setError('')
  }, [cancel])

  const analyze = useCallback(async (audioFile) => {
    if (!audioFile) return null
    cancel()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('analyzing')
    setProgress({ value: 1, stage: 'Preparando a análise local' })
    setResult(null)
    setError('')

    try {
      const analysis = await detectKey(audioFile, {
        signal: controller.signal,
        onProgress: (value, stage) => setProgress({ value, stage }),
      })
      setResult(analysis)
      setStatus('done')
      return analysis
    } catch (analysisError) {
      if (analysisError.name !== 'AbortError') setError(analysisError.message)
      setStatus('idle')
      return null
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { status, progress, result, error, analyze, cancel, reset, restore, setError }
}
