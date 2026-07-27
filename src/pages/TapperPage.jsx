import { useEffect, useMemo, useState } from 'react'
import Header from '../components/Header.jsx'

const MAX_TAPS = 64
const IDLE_TIMEOUT = 5000

function calculateBpm(taps) {
  if (taps.length < 2) return null
  const intervals = taps
    .slice(1)
    .map((tap, index) => tap - taps[index])
    .filter((interval) => interval > 0)

  if (!intervals.length) return null
  const sortedIntervals = intervals.toSorted((a, b) => a - b)
  const trimCount = intervals.length >= 5
    ? Math.max(1, Math.floor(intervals.length * 0.1))
    : 0
  const stableIntervals = trimCount
    ? sortedIntervals.slice(trimCount, -trimCount)
    : sortedIntervals
  const average = stableIntervals.reduce((total, interval) => total + interval, 0) / stableIntervals.length
  return Math.round(60000 / average)
}

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
  const bpm = useMemo(() => calculateBpm(taps), [taps])
  const isActive = taps.length > 0 && now - taps.at(-1) < IDLE_TIMEOUT
  const elapsed = taps.length > 1 ? (taps.at(-1) - taps[0]) / 1000 : 0
  const precision = getPrecision(taps.length)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  function registerTap() {
    const timestamp = Date.now()
    setNow(timestamp)
    setTaps((current) => {
      const session = current.length && timestamp - current.at(-1) > IDLE_TIMEOUT ? [] : current
      return [...session, timestamp].slice(-MAX_TAPS)
    })
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

      <footer className="stats" aria-label="Estatísticas da medição">
        <div><span>TOQUES</span><strong>{taps.length}</strong></div><i aria-hidden="true" />
        <div><span>AMOSTRA</span><strong>{elapsed ? `${elapsed.toFixed(1)}s` : '—'}</strong></div><i aria-hidden="true" />
        <div><span>PRECISÃO</span><strong>{precision}</strong></div>
      </footer>
    </main>
  )
}
