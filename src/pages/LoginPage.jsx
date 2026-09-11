import { useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'

export default function LoginPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const busy = auth.status === 'submitting'

  async function submit(event) {
    event.preventDefault()
    const signedIn = await auth.signIn({ email, password })
    if (signedIn) globalThis.location.href = '/'
  }

  return (
    <main className="app-shell auth-shell">
      <Header showAccount={false} />
      <section className="auth-hero">
        <p className="eyebrow">OUÇA. MEÇA. DESCUBRA.</p>
        <h1>Encontre o ritmo<br />e o tom da música.</h1>
        <p>Duas ferramentas rápidas para quem produz, toca ou quer entender melhor uma faixa.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <h2>Já possui conta?</h2>
        {auth.status === 'unconfigured' ? (
          <p className="auth-message">Configure o Supabase para habilitar o acesso.</p>
        ) : (
          <>
            <label>Digite seu e-mail cadastrado<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Digite sua senha<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Fazer login'}</button>
            <a className="auth-link" href="/account/recovery">Esqueci minha senha</a>
            {auth.message && <p className="auth-message" role="status">{auth.message}</p>}
          </>
        )}
        <div className="auth-divider" />
        <h2 className="auth-second-heading">Primeiro acesso?</h2>
        <a className="primary-link" href="/register">Registrar-se</a>
      </form>
      <footer className="home-footer auth-footer"><span>PROCESSAMENTO LOCAL</span><span><a href="/privacy">PRIVACIDADE</a> · <a href="/terms">TERMOS</a></span></footer>
    </main>
  )
}
