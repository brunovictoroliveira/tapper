import { useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { passwordStrength, validateRegistrationForm } from '../services/authFormValidation.js'

export default function RegisterPage() {
  const auth = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirmation, setEmailConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const busy = auth.status === 'submitting'
  const errors = validateRegistrationForm({ name, email, emailConfirmation, password, passwordConfirmation })
  const strength = passwordStrength(password)

  function errorFor(field) {
    return (submitted || touched[field]) ? errors[field] : ''
  }

  function touch(field) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    const result = await auth.signUp({ email, password, displayName: name })
    if (result) globalThis.location.href = '/confirm-registration'
  }

  return (
    <main className="app-shell register-shell">
      <Header showAccount={false} />
      <form className="register-card" noValidate onSubmit={submit}>
        <h1>Cadastre-se</h1>
        <label className="auth-field">Digite seu nome
          <input required autoComplete="name" value={name} aria-invalid={Boolean(errorFor('name'))} aria-describedby={errorFor('name') ? 'register-name-error' : undefined} onBlur={() => touch('name')} onChange={(event) => setName(event.target.value)} />
          {errorFor('name') && <span className="field-error" id="register-name-error">{errorFor('name')}</span>}
        </label>
        <label className="auth-field">Digite seu e-mail
          <input required type="email" autoComplete="email" value={email} aria-invalid={Boolean(errorFor('email'))} aria-describedby={errorFor('email') ? 'register-email-error' : undefined} onBlur={() => touch('email')} onChange={(event) => setEmail(event.target.value)} />
          {errorFor('email') && <span className="field-error" id="register-email-error">{errorFor('email')}</span>}
        </label>
        <label className="auth-field">Confirme o e-mail
          <input required type="email" autoComplete="email" value={emailConfirmation} aria-invalid={Boolean(errorFor('emailConfirmation'))} aria-describedby={errorFor('emailConfirmation') ? 'register-email-confirmation-error' : undefined} onBlur={() => touch('emailConfirmation')} onChange={(event) => setEmailConfirmation(event.target.value)} />
          {errorFor('emailConfirmation') && <span className="field-error" id="register-email-confirmation-error">{errorFor('emailConfirmation')}</span>}
        </label>
        <label className="auth-field">Crie uma senha
          <input required type="password" minLength="8" autoComplete="new-password" value={password} aria-invalid={Boolean(errorFor('password'))} aria-describedby="password-guidance register-password-error" onBlur={() => touch('password')} onChange={(event) => setPassword(event.target.value)} />
          <span className="password-guidance" id="password-guidance">
            <span>Use pelo menos 8 caracteres.</span>
            <span className={`password-strength strength-${strength.tone}`}><span>Força da senha: <strong>{strength.label}</strong></span><i aria-hidden="true"><b /><b /><b /></i></span>
          </span>
          {errorFor('password') && <span className="field-error" id="register-password-error">{errorFor('password')}</span>}
        </label>
        <label className="auth-field">Digite novamente a senha
          <input required type="password" minLength="8" autoComplete="new-password" value={passwordConfirmation} aria-invalid={Boolean(errorFor('passwordConfirmation'))} aria-describedby={errorFor('passwordConfirmation') ? 'register-password-confirmation-error' : undefined} onBlur={() => touch('passwordConfirmation')} onChange={(event) => setPasswordConfirmation(event.target.value)} />
          {errorFor('passwordConfirmation') && <span className="field-error" id="register-password-confirmation-error">{errorFor('passwordConfirmation')}</span>}
        </label>
        <button className="primary-button" type="submit" disabled={busy || auth.status === 'unconfigured'}>{busy ? 'Registrando…' : 'Registrar-se'}</button>
        {auth.message && <p className="auth-message" role="status">{auth.message}</p>}
      </form>
      <footer className="home-footer auth-footer"><span>PROCESSAMENTO LOCAL</span><span><a href="/privacy">PRIVACIDADE</a> · <a href="/terms">TERMOS</a></span></footer>
    </main>
  )
}
