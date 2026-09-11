import { useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'

export default function RegisterPage() {
  const auth = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirmation, setEmailConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [formError, setFormError] = useState('')
  const busy = auth.status === 'submitting'

  async function submit(event) {
    event.preventDefault()
    setFormError('')
    if (email.trim().toLowerCase() !== emailConfirmation.trim().toLowerCase()) return setFormError('Os e-mails precisam ser iguais.')
    if (password !== passwordConfirmation) return setFormError('As senhas precisam ser iguais.')
    const result = await auth.signUp({ email, password, displayName: name })
    if (result) globalThis.location.href = '/confirm-registration'
  }

  return (
    <main className="app-shell register-shell">
      <Header showAccount={false} />
      <form className="register-card" onSubmit={submit}>
        <h1>Cadastre-se</h1>
        <label>Digite seu nome<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Digite seu e-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Confirme o e-mail<input required type="email" autoComplete="email" value={emailConfirmation} onChange={(event) => setEmailConfirmation(event.target.value)} /></label>
        <label>Crie uma senha<input required type="password" minLength="8" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <label>Digite novamente a senha<input required type="password" minLength="8" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} /></label>
        <button className="primary-button" type="submit" disabled={busy || auth.status === 'unconfigured'}>{busy ? 'Registrando…' : 'Registrar-se'}</button>
        {(formError || auth.message) && <p className="auth-message" role="status">{formError || auth.message}</p>}
      </form>
      <footer className="home-footer auth-footer"><span>PROCESSAMENTO LOCAL</span><span><a href="/privacy">PRIVACIDADE</a> · <a href="/terms">TERMOS</a></span></footer>
    </main>
  )
}
