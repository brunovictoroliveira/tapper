import Header from '../../../components/Header.jsx'
import { useAuth } from '../../auth/hooks/useAuth.js'

export function CloudGate({ children, title = 'TAPPER CLOUD' }) {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return <main className="app-shell cloud-shell"><p className="cloud-state">Carregando sua biblioteca…</p></main>
  }

  if (auth.status === 'unconfigured' || !auth.session) {
    return (
      <main className="app-shell cloud-shell">
        <Header action={<span className="topbar-label">{title}</span>} />
        <a className="back-link" href="/">← Ferramentas</a>
        <section className="cloud-state-card">
          <p className="eyebrow">BIBLIOTECA SINCRONIZADA</p>
          <h1>{auth.status === 'unconfigured' ? 'Cloud não configurado' : 'Entre para continuar'}</h1>
          <p>{auth.status === 'unconfigured'
            ? 'Configure o Supabase neste ambiente para habilitar a biblioteca.'
            : 'Sua biblioteca local continua disponível sem conta.'}</p>
          <a className="primary-link" href="/account">Abrir conta</a>
        </section>
      </main>
    )
  }

  return children({ auth })
}

export function CloudNavigation() {
  return (
    <nav className="cloud-nav" aria-label="Tapper Cloud">
      <a href="/cloud">Visão geral</a>
      <a href="/cloud/songs">Músicas</a>
      <a href="/cloud/projects">Projetos</a>
      <a href="/account">Conta</a>
      <a href="/account/storage">Armazenamento</a>
    </nav>
  )
}
