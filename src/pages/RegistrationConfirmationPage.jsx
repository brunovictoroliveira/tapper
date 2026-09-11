import Header from '../components/Header.jsx'

export default function RegistrationConfirmationPage() {
  return (
    <main className="app-shell confirmation-shell">
      <Header showAccount={false} />
      <section className="confirmation-content">
        <h1>Te enviamos um e-mail<br />para confirmar o cadastro!</h1>
        <p className="confirmation-logo">tapper<span>.</span></p>
        <a className="primary-link" href="/login">Fazer login</a>
      </section>
    </main>
  )
}
