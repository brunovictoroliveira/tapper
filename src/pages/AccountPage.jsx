import { useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { deleteAccount } from '../services/accountService.js'
import { exportAllAsJson, exportAllAsZip } from '../services/dataExportService.js'

export default function AccountPage({ resetPassword = false }) {
  const auth = useAuth()
  const [mode, setMode] = useState(resetPassword ? 'update-password' : 'sign-in')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountAction, setAccountAction] = useState('')
  const [deleteEmail, setDeleteEmail] = useState('')
  const busy = auth.status === 'submitting'

  async function submit(event) {
    event.preventDefault()
    if (mode === 'sign-in') await auth.signIn({ email, password })
    if (mode === 'sign-up') await auth.signUp({ email, password, displayName })
    if (mode === 'recovery') await auth.requestPasswordReset(email)
    if (mode === 'update-password') await auth.updatePassword(password)
  }

  async function exportData(format) {
    setAccountAction('Preparando exportação…')
    try {
      if (format === 'zip') await exportAllAsZip(setAccountAction)
      else await exportAllAsJson()
      setAccountAction('Exportação concluída.')
    } catch (error) {
      setAccountAction(error.message)
    }
  }

  async function removeAccount() {
    if (deleteEmail.toLowerCase() !== auth.session.user.email.toLowerCase()) {
      setAccountAction('Digite o e-mail exato da conta para confirmar.')
      return
    }
    if (!globalThis.confirm('Esta ação exclui permanentemente conta, projetos e arquivos. Deseja continuar?')) return
    setAccountAction('Excluindo conta e arquivos…')
    try {
      await deleteAccount(deleteEmail)
      globalThis.location.href = '/'
    } catch (error) {
      setAccountAction(error.message)
    }
  }

  if (auth.status === 'unconfigured') {
    return (
      <main className="app-shell account-shell">
        <Header action={<span className="topbar-label">TAPPER CLOUD</span>} />
        <a className="back-link" href="/">← Ferramentas</a>
        <section className="account-card">
          <p className="eyebrow">CONFIGURAÇÃO PENDENTE</p>
          <h1>Tapper Cloud</h1>
          <p>Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` para habilitar contas neste ambiente.</p>
        </section>
      </main>
    )
  }

  if (auth.session && mode !== 'update-password') {
    const profile = auth.entitlement?.profile
    const canWrite = auth.entitlement?.canWriteCloud
    return (
      <main className="app-shell account-shell">
        <Header action={<span className="topbar-label">MINHA CONTA</span>} />
        <a className="back-link" href="/">← Ferramentas</a>
        <section className="account-card">
          <p className="eyebrow">CONTA CONECTADA</p>
          <h1>{profile?.display_name || 'Sua conta'}</h1>
          <p>{auth.session.user.email}</p>
          <dl className="account-details">
            <div><dt>Plano</dt><dd>{canWrite ? 'Tapper Cloud' : 'Gratuito'}</dd></div>
            <div><dt>Armazenamento</dt><dd>{profile ? `${Math.round(profile.storage_used_bytes / 1024 / 1024)} MB usados` : '—'}</dd></div>
          </dl>
          <button className="primary-button" type="button" disabled={busy} onClick={auth.signOut}>Sair</button>
          <a className="account-subscription-link" href="/account/subscription">Gerenciar assinatura</a>
          <section className="account-data-actions">
            <h2>Seus dados</h2>
            <div><button type="button" onClick={() => exportData('json')}>Exportar JSON</button><button type="button" onClick={() => exportData('zip')}>Exportar ZIP completo</button></div>
          </section>
          <section className="danger-zone">
            <h2>Excluir conta</h2>
            <p>Digite {auth.session.user.email} para confirmar. A assinatura, os projetos e os arquivos serão removidos.</p>
            <input type="email" value={deleteEmail} onChange={(event) => setDeleteEmail(event.target.value)} placeholder="Confirme seu e-mail" />
            <button type="button" onClick={removeAccount}>Excluir permanentemente</button>
          </section>
          {accountAction && <p className="account-message" role="status">{accountAction}</p>}
          {auth.message && <p className="account-message" role="status">{auth.message}</p>}
        </section>
      </main>
    )
  }

  const titles = {
    'sign-in': 'Entre na sua conta',
    'sign-up': 'Crie sua conta',
    recovery: 'Recupere sua senha',
    'update-password': 'Defina uma nova senha',
  }

  return (
    <main className="app-shell account-shell">
      <Header action={<span className="topbar-label">TAPPER CLOUD</span>} />
      <a className="back-link" href="/">← Ferramentas</a>
      <form className="account-card" onSubmit={submit}>
        <p className="eyebrow">SINCRONIZE SUA BIBLIOTECA</p>
        <h1>{titles[mode]}</h1>
        {mode === 'sign-up' && (
          <label>Nome<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label>
        )}
        {mode !== 'update-password' && (
          <label>E-mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
        )}
        {mode !== 'recovery' && (
          <label>Senha<input type="password" required minLength="8" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label>
        )}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Aguarde…' : 'Continuar'}</button>
        {auth.message && <p className="account-message" role="status">{auth.message}</p>}
        {!resetPassword && (
          <nav className="account-options" aria-label="Opções da conta">
            {mode !== 'sign-in' && <button type="button" onClick={() => setMode('sign-in')}>Já tenho conta</button>}
            {mode !== 'sign-up' && <button type="button" onClick={() => setMode('sign-up')}>Criar conta</button>}
            {mode !== 'recovery' && <button type="button" onClick={() => setMode('recovery')}>Esqueci a senha</button>}
          </nav>
        )}
      </form>
    </main>
  )
}
