import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { subscriptionService } from '../services/subscriptionService.js'

const STATUS_LABELS = {
  pending: 'Aguardando confirmação',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  cancelled: 'Cancelada',
}

function SubscriptionContent() {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    subscriptionService.status().then((result) => setSubscription(result.subscription))
      .catch((error) => setMessage(error.message)).finally(() => setLoading(false))
  }, [])

  async function subscribe() {
    setLoading(true)
    try {
      const result = await subscriptionService.create()
      globalThis.location.href = result.checkoutUrl
    } catch (error) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  async function cancel() {
    if (!globalThis.confirm('Cancelar a renovação do Tapper Cloud? Sua biblioteca ficará somente leitura.')) return
    setLoading(true)
    try {
      const result = await subscriptionService.cancel()
      setSubscription((current) => ({ ...current, status: 'cancelled', grace_period_end: result.readOnlyUntil }))
      setMessage('Assinatura cancelada. A exportação continua disponível.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell cloud-shell subscription-shell">
      <Header action={<span className="topbar-label">ASSINATURA</span>} />
      <CloudNavigation />
      <section className="subscription-card">
        <p className="eyebrow">TAPPER CLOUD</p>
        <h1>R$ 9,99 <span>/ mês</span></h1>
        <ul><li>500 músicas</li><li>50 projetos</li><li>1 GB de armazenamento</li><li>Sincronização entre dispositivos</li></ul>
        {subscription && <div className={`subscription-status status-${subscription.status}`}><span>Status</span><strong>{STATUS_LABELS[subscription.status] || subscription.status}</strong></div>}
        {(!subscription || subscription.status === 'cancelled') && <button className="primary-button" type="button" disabled={loading} onClick={subscribe}>Assinar Tapper Cloud</button>}
        {subscription && ['pending', 'active', 'past_due'].includes(subscription.status) && <button className="secondary-button" type="button" disabled={loading} onClick={cancel}>Cancelar assinatura</button>}
        {message && <p className="account-message" role="status">{message}</p>}
      </section>
    </main>
  )
}

export default function SubscriptionPage() {
  return <CloudGate title="ASSINATURA">{() => <SubscriptionContent />}</CloudGate>
}
