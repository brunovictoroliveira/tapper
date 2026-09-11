import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'
import { calculateTapBpm, detectBpm } from '../services/bpmDetectionService.js'
import { saveBpmDetection } from '../services/bpmReportService.js'

const MAX_TAPS = 64
const IDLE_TIMEOUT = 5000

function getPrecision(tapCount) {
  if (tapCount < 2) return '—'
  if (tapCount < 5) return 'INICIAL'
  if (tapCount < 10) return 'MELHORANDO'
  if (tapCount < 20) return 'BOA'
  return 'ALTA'
}

export default function TapperPage() {
  const [taps, setTaps] = useState([])
  const [now, setNow] = useState(Date.now())
  const [automaticBpm, setAutomaticBpm] = useState(null)
  const [automaticConfidence, setAutomaticConfidence] = useState(null)
  const [analysisStatus, setAnalysisStatus] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [method, setMethod] = useState('manual')
  const manualBpm = useMemo(() => calculateTapBpm(taps), [taps])
  const bpm = method === 'automatic' ? automaticBpm : manualBpm
  const isActive = taps.length > 0 && now - taps.at(-1) < IDLE_TIMEOUT
  const elapsed = taps.length > 1 ? (taps.at(-1) - taps[0]) / 1000 : 0
  const precision = getPrecision(taps.length)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  function registerTap() {
    setMethod('manual')
    const timestamp = Date.now()
    setNow(timestamp)
    setTaps((current) => {
      const session = current.length && timestamp - current.at(-1) > IDLE_TIMEOUT ? [] : current
      return [...session, timestamp].slice(-MAX_TAPS)
    })
  }

  async function analyzeFile(file) {
    if (!file) return
    setAnalysisStatus('Preparando análise…')
    setSaveStatus('')
    try {
      const result = await detectBpm(file, { onProgress: setAnalysisStatus })
      setAutomaticBpm(result.bpm)
      setAutomaticConfidence(result.confidence)
      setSongTitle(file.name.replace(/\.[^.]+$/, ''))
      setMethod('automatic')
      setAnalysisStatus('BPM detectado.')
    } catch (error) {
      setAnalysisStatus(error.message)
    }
  }

  async function saveDetection(event) {
    event.preventDefault()
    if (!bpm) return
    setSaveStatus('Salvando…')
    try {
      await saveBpmDetection({ songTitle, artist, bpm, method })
      setSaveStatus('Detecção salva no relatório administrativo.')
    } catch (error) {
      setSaveStatus(error.message)
    }
  }

  return (
    <main className="app-shell tapper-shell">
      <Header action={
        <button className="text-button" type="button" onClick={() => setTaps([])} disabled={!taps.length}>
          Reiniciar
        </button>
      } />
      <a className="back-link" href="/">← Ferramentas</a>

      <section className="meter" aria-live="polite" aria-atomic="true">
        <p className="eyebrow">SEU RITMO</p>
        <div className="bpm-display"><strong>{bpm ?? '—'}</strong><span>BPM</span></div>
        <p className="meter-status">
          {!taps.length && 'Toque no botão para começar'}
          {taps.length === 1 && 'Mais um toque para calcular'}
          {taps.length > 1 && isActive && precision !== 'ALTA' && `Precisão ${precision.toLowerCase()} — continue tocando`}
          {taps.length > 1 && isActive && precision === 'ALTA' && 'Precisão alta — ritmo estabilizado'}
          {taps.length > 1 && !isActive && 'Ritmo pausado — toque para continuar'}
        </p>
      </section>

      <section className="tap-area" aria-label="Área de toque">
        <button className={`tap-button ${isActive ? 'is-active' : ''}`} type="button" onClick={registerTap}>
          <span className="tap-rings" aria-hidden="true" />
          <span className="tap-label">TAP</span><span className="tap-hint">toque aqui</span>
        </button>
      </section>

      <section className="bpm-automatic-panel">
        <div><p className="eyebrow">DETECÇÃO AUTOMÁTICA</p><h2>Envie uma faixa para estimar o BPM</h2><p>O áudio é analisado apenas neste dispositivo.</p></div>
        <label className="secondary-button">Escolher arquivo<input type="file" accept="audio/*,.mp3,.wav" onChange={(event) => analyzeFile(event.target.files?.[0])} /></label>
        {analysisStatus && <p className="bpm-analysis-status">{analysisStatus}{automaticConfidence != null && method === 'automatic' ? ` · confiança ${Math.round(automaticConfidence * 100)}%` : ''}</p>}
      </section>

      {bpm && <form className="bpm-save-panel" onSubmit={saveDetection}>
        <div><p className="eyebrow">SALVAR MEDIÇÃO</p><h2>{bpm.toFixed(1)} BPM <span>{method === 'automatic' ? 'automático' : 'manual'}</span></h2></div>
        <label>Nome da música<input required value={songTitle} onChange={(event) => setSongTitle(event.target.value)} placeholder="Ex.: Minha música" /></label>
        <label>Nome do artista<input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Ex.: Artista" /></label>
        <button className="primary-button" type="submit">Salvar no relatório</button>
        {saveStatus && <p className="bpm-analysis-status" role="status">{saveStatus}</p>}
      </form>}

      <footer className="stats" aria-label="Estatísticas da medição">
        <div><span>TOQUES</span><strong>{taps.length}</strong></div><i aria-hidden="true" />
        <div><span>AMOSTRA</span><strong>{elapsed ? `${elapsed.toFixed(1)}s` : '—'}</strong></div><i aria-hidden="true" />
        <div><span>PRECISÃO</span><strong>{precision}</strong></div>
      </footer>
    </main>
  )
}
