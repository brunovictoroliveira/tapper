import { useEffect, useRef, useState } from 'react'
import Header from '../components/Header.jsx'
import { useKeyDetection } from '../features/key-detection/hooks/useKeyDetection.js'
import { LocalSongHistory } from '../features/local-library/components/LocalSongHistory.jsx'
import { useLocalSongHistory } from '../features/local-library/hooks/useLocalSongHistory.js'
import { localProjectRepository } from '../repositories/localProjectRepository.js'
import { localSongRepository } from '../repositories/localSongRepository.js'

const MAX_FILE_SIZE = 250 * 1024 * 1024
const MAX_RECORDING_SECONDS = 30

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
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
  const {
    status,
    progress,
    result,
    error,
    analyze,
    cancel,
    reset: resetAnalysis,
    restore: restoreAnalysis,
    setError,
  } = useKeyDetection()
  const localHistory = useLocalSongHistory()
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    const projectId = new URLSearchParams(globalThis.location.search).get('project')
    if (!projectId) return
    Promise.all([
      localProjectRepository.findById(projectId),
      localProjectRepository.findById(projectId).then((project) => project?.songId ? localSongRepository.findById(project.songId) : null),
    ]).then(([project, song]) => {
      if (!project) return
      const state = project.projectState || {}
      restoreAnalysis({
        key: state.detectedKey || state.selectedKey || song?.detectedKey || '—',
        mode: state.detectedMode || song?.detectedMode || 'unknown',
        confidence: state.confidence || song?.detectionConfidence || 0,
        durationMs: song?.durationMs || 0,
        camelot: song?.camelot || '—',
        alternative: song?.alternative || { display: '—', camelot: '—' },
        analyzedAt: song?.analyzedAt || project.updatedAt,
        restoredProject: project,
      })
    }).catch((restoreError) => setError(restoreError.message))
  }, [restoreAnalysis, setError])

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
    resetAnalysis()
  }

  async function startRecording() {
    resetAnalysis()

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
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    releaseMicrophone()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const isBusy = status === 'analyzing'

  async function analyzeAndSave() {
    const analysis = await analyze(audioFile)
    if (analysis) await localHistory.saveAnalysis(analysis, audioFile)
  }

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
                <button className="primary-button" type="button" disabled={isBusy} onClick={analyzeAndSave}>
                  {isBusy ? 'Analisando áudio…' : 'Detectar tonalidade'}
                </button>
                {isBusy && (
                  <div className="analysis-progress" aria-live="polite">
                    <div className="progress-status">
                      <span>{progress.stage}</span>
                      <strong>{progress.value}%</strong>
                    </div>
                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-label={progress.stage}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={progress.value}
                    >
                      <span style={{ width: `${progress.value}%` }} />
                    </div>
                    <button className="cancel-button" type="button" onClick={cancel}>
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
              <strong>{result.key}</strong>
              <span>{result.mode === 'major' ? 'MAIOR' : 'MENOR'}</span>
            </div>
            <div className="result-meta">
              <div><span>CAMELOT</span><strong>{result.camelot}</strong></div>
              <div><span>CONFIANÇA</span><strong>{Math.round(result.confidence * 100)}%</strong></div>
              <div><span>ALTERNATIVA</span><strong>{result.alternative.display}</strong></div>
            </div>
            <p className="result-note">Resultado estimado a partir do perfil harmônico da faixa.</p>
            {result.restoredProject && <p className="restored-project-note">Projeto restaurado: {result.restoredProject.name}</p>}
            <button className="primary-button" type="button" onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl)
              setAudioFile(null)
              setPreviewUrl('')
              resetAnalysis()
            }}>
              Analisar outra faixa
            </button>
          </div>
        )}

        {error && <p className="error-message" role="alert">{error}</p>}

        <LocalSongHistory
          songs={localHistory.songs}
          status={localHistory.status}
          message={localHistory.message}
          onRemove={localHistory.removeSong}
          onExport={localHistory.exportBackup}
          onImport={localHistory.importBackup}
        />
      </section>

      <footer className="privacy-note">
        <span aria-hidden="true">◇</span>
        O áudio é analisado localmente e não sai deste dispositivo.
      </footer>
    </main>
  )
}
