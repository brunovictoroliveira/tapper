import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header.jsx'

const MAX_FILE_SIZE = 250 * 1024 * 1024
const MAX_RECORDING_SECONDS = 30
const API_BASE = import.meta.env.VITE_API_URL || ''

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function uploadAudio(file, analysisId, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const form = new FormData()
    form.append('audio', file)

    request.open('POST', `${API_BASE}/api/analyze-key?analysis_id=${encodeURIComponent(analysisId)}`)
    request.timeout = 10 * 60 * 1000
    request.responseType = 'json'
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const uploadPercent = Math.round((event.loaded / event.total) * 24)
      onProgress(uploadPercent, 'Enviando o áudio')
    }
    request.upload.onload = () => onProgress(25, 'Upload concluído')
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response)
        return
      }
      reject(new Error(request.response?.detail || 'Não foi possível analisar este áudio.'))
    }
    request.onerror = () => reject(new Error('Não foi possível conectar ao servidor de análise.'))
    request.ontimeout = () => reject(new Error('A análise demorou mais do que o esperado.'))
    request.onabort = () => reject(new DOMException('Upload cancelado.', 'AbortError'))
    signal.addEventListener('abort', () => request.abort(), { once: true })
    request.send(form)
  })
}

function watchAnalysisProgress(analysisId, onProgress, signal) {
  let stopped = false
  let timer = null

  async function poll() {
    try {
      const response = await fetch(`${API_BASE}/api/analyze-key/progress/${analysisId}`, {
        cache: 'no-store',
        signal,
      })
      if (response.ok) {
        const update = await response.json()
        onProgress(update.progress, update.stage)
      }
    } catch (pollError) {
      if (pollError.name === 'AbortError') return
    }

    if (!stopped) timer = window.setTimeout(poll, 350)
  }

  poll()
  return () => {
    stopped = true
    if (timer) window.clearTimeout(timer)
  }
}

function RecordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="3" width="8" height="12" rx="4" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  )
}

export default function KeyDetectorPage() {
  const [audioFile, setAudioFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('Pronto para analisar')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const abortRef = useRef(null)
  const progressRef = useRef(0)

  function applyProgress(nextProgress, nextStage) {
    const normalized = Math.max(0, Math.min(100, Math.round(nextProgress)))
    if (normalized < progressRef.current) return
    progressRef.current = normalized
    setProgress(normalized)
    if (nextStage) setStage(nextStage)
  }

  function resetProgress() {
    progressRef.current = 0
    setProgress(0)
    setStage('Pronto para analisar')
  }

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function useAudioFile(file) {
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo ultrapassa o limite de 250 MB.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setAudioFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setResult(null)
    setError('')
    setStatus('idle')
    resetProgress()
  }

  async function startRecording() {
    setError('')
    setResult(null)

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error('unsupported')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream)

      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const extension = type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        useAudioFile(new File([blob], `gravacao-${Date.now()}.${extension}`, { type }))
        releaseMicrophone()
      }
      recorder.start(1000)
      setRecordingSeconds(0)
      setIsRecording(true)
    } catch {
      releaseMicrophone()
      setError('Não foi possível acessar o microfone. Verifique a permissão do navegador.')
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    setIsRecording(false)
  }

  useEffect(() => {
    if (!isRecording) return undefined
    const timer = window.setInterval(() => {
      setRecordingSeconds((seconds) => {
        if (seconds + 1 >= MAX_RECORDING_SECONDS) {
          window.setTimeout(stopRecording, 0)
          return MAX_RECORDING_SECONDS
        }
        return seconds + 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRecording])

  useEffect(() => () => {
    abortRef.current?.abort()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    releaseMicrophone()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function analyze() {
    if (!audioFile) return
    const controller = new AbortController()
    const analysisId = window.crypto.randomUUID()
    abortRef.current = controller
    setStatus('analyzing')
    progressRef.current = 0
    applyProgress(1, 'Preparando o upload')
    setResult(null)
    setError('')

    const stopWatching = watchAnalysisProgress(analysisId, applyProgress, controller.signal)
    try {
      const analysis = await uploadAudio(audioFile, analysisId, applyProgress, controller.signal)
      applyProgress(100, 'Análise concluída')
      setResult(analysis)
      setStatus('done')
    } catch (uploadError) {
      if (uploadError.name !== 'AbortError') setError(uploadError.message)
      setStatus('idle')
    } finally {
      stopWatching()
      abortRef.current = null
    }
  }

  const isBusy = status === 'analyzing'

  return (
    <main className="app-shell key-shell">
      <Header action={<span className="topbar-label">KEY DETECTOR</span>} />
      <a className="back-link" href="/">← Ferramentas</a>

      <section className="key-heading">
        <p className="eyebrow">DESCUBRA A TONALIDADE</p>
        <h1>Qual é o tom<br />dessa música?</h1>
        <p>Envie um MP3 ou WAV, ou capture até 30 segundos pelo microfone.</p>
      </section>

      <section className="key-workspace">
        {!result && (
          <div className="input-panel">
            <label className={`drop-zone ${audioFile ? 'has-file' : ''}`}>
              <input
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
                disabled={isBusy || isRecording}
                onChange={(event) => useAudioFile(event.target.files?.[0])}
              />
              <span className="upload-mark" aria-hidden="true">↑</span>
              <strong>{audioFile ? audioFile.name : 'Escolha uma faixa'}</strong>
              <span>{audioFile ? formatBytes(audioFile.size) : 'MP3 ou WAV · até 250 MB'}</span>
            </label>

            <div className="or-divider"><span>OU</span></div>

            <button
              className={`record-button ${isRecording ? 'is-recording' : ''}`}
              type="button"
              disabled={isBusy}
              onClick={isRecording ? stopRecording : startRecording}
            >
              <RecordIcon />
              <span>
                <strong>{isRecording ? 'Parar gravação' : 'Usar microfone'}</strong>
                <small>{isRecording ? `${recordingSeconds}s de ${MAX_RECORDING_SECONDS}s` : 'Capture um trecho da música'}</small>
              </span>
              {isRecording && <i aria-hidden="true" />}
            </button>

            {audioFile && !isRecording && (
              <div className="audio-ready">
                <audio controls src={previewUrl}>Seu navegador não suporta áudio.</audio>
                <button className="primary-button" type="button" disabled={isBusy} onClick={analyze}>
                  {isBusy ? 'Analisando áudio…' : 'Detectar tonalidade'}
                </button>
                {isBusy && (
                  <div className="analysis-progress" aria-live="polite">
                    <div className="progress-status">
                      <span>{stage}</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={stage}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={progress}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <button className="cancel-button" type="button" onClick={() => abortRef.current?.abort()}>
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="result-card" aria-live="polite">
            <p className="eyebrow">TONALIDADE DETECTADA</p>
            <div className="key-result">
              <strong>{result.tonic}</strong>
              <span>{result.mode === 'major' ? 'MAIOR' : 'MENOR'}</span>
            </div>
            <div className="result-meta">
              <div><span>CAMELOT</span><strong>{result.camelot}</strong></div>
              <div><span>CONFIANÇA</span><strong>{Math.round(result.confidence * 100)}%</strong></div>
              <div><span>ALTERNATIVA</span><strong>{result.alternative.display}</strong></div>
            </div>
            <p className="result-note">Resultado estimado a partir do perfil harmônico da faixa.</p>
            <button className="primary-button" type="button" onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setResult(null)
              setAudioFile(null)
              setPreviewUrl('')
              resetProgress()
            }}>
              Analisar outra faixa
            </button>
          </div>
        )}

        {error && <p className="error-message" role="alert">{error}</p>}
      </section>

      <footer className="privacy-note">
        <span aria-hidden="true">◇</span>
        O áudio é processado temporariamente e apagado após a análise.
      </footer>
    </main>
  )
}
