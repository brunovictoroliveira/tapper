import Header from '../components/Header.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'

function TapIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="13" />
      <path d="M24 5v5M24 38v5M5 24h5M38 24h5" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M16 7v27.5a6.5 6.5 0 1 1-3-5.5V13l22-5v21.5a6.5 6.5 0 1 1-3-5.5V7" />
    </svg>
  )
}

export default function HomePage() {
  const auth = useAuth()

  if (!auth.session && auth.status !== 'loading') {
    globalThis.location.replace('/login')
    return null
  }

  return (
    <main className="app-shell home-shell">
      <Header action={auth.entitlement?.isAdmin ? <a className="topbar-link" href="/admin">RELATÓRIOS</a> : null} />

      <section className="home-hero">
        <p className="eyebrow">OUÇA. MEÇA. DESCUBRA.</p>
        <h1>Encontre o ritmo<br />e o tom da música.</h1>
        <p className="home-intro">
          Duas ferramentas rápidas para quem produz, toca ou simplesmente quer entender melhor uma faixa.
        </p>
      </section>

      <section className="tool-grid" aria-label="Escolha uma ferramenta">
        <a className="tool-card tool-card-tap" href="/tap">
          <span className="tool-number">01</span>
          <span className="tool-icon"><TapIcon /></span>
          <span className="tool-copy">
            <strong>Tap BPM</strong>
            <span>Toque acompanhando o ritmo e descubra o andamento.</span>
          </span>
          <span className="tool-arrow" aria-hidden="true">↗</span>
        </a>

        <a className="tool-card tool-card-key" href="/key">
          <span className="tool-number">02</span>
          <span className="tool-icon"><KeyIcon /></span>
          <span className="tool-copy">
            <strong>Key Detector</strong>
            <span>Envie uma faixa ou grave o ambiente para encontrar o tom.</span>
          </span>
          <span className="tool-arrow" aria-hidden="true">↗</span>
        </a>
      </section>

      <footer className="home-footer">
        <span>PROCESSAMENTO LOCAL</span>
        <span><a href="/privacy">PRIVACIDADE</a> · <a href="/terms">TERMOS</a></span>
      </footer>
    </main>
  )
}
