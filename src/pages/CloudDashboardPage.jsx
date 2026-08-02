import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { SyncLocalButton } from '../features/cloud/components/SyncLocalButton.jsx'

function megabytes(bytes) {
  return `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`
}

export default function CloudDashboardPage() {
  return (
    <CloudGate>{({ auth }) => {
      const profile = auth.entitlement?.profile
      const used = Number(profile?.storage_used_bytes || 0)
      const quota = Number(profile?.storage_quota_bytes || 0)
      const percentage = quota ? Math.min(100, (used / quota) * 100) : 0
      return (
        <main className="app-shell cloud-shell">
          <Header action={<span className="topbar-label">TAPPER CLOUD</span>} />
          <CloudNavigation />
          <section className="cloud-heading">
            <p className="eyebrow">SUA MÚSICA, EM TODO LUGAR</p>
            <h1>Biblioteca<br />sincronizada.</h1>
            {!auth.entitlement?.canWriteCloud && <p className="cloud-warning">Sua conta está em modo somente leitura.</p>}
          </section>
          <section className="cloud-dashboard-grid">
            <a href="/cloud/songs"><span>MÚSICAS</span><strong>Abrir biblioteca</strong><i>↗</i></a>
            <a href="/cloud/projects"><span>PROJETOS</span><strong>Estados salvos</strong><i>↗</i></a>
            <div className="storage-card">
              <span>ARMAZENAMENTO</span>
              <strong>{megabytes(used)} de {megabytes(quota)}</strong>
              <div><i style={{ width: `${percentage}%` }} /></div>
            </div>
          </section>
          <section className="cloud-sync-panel">
            <div><p className="eyebrow">DESTE DISPOSITIVO</p><h2>Leve seu histórico para a nuvem.</h2></div>
            <SyncLocalButton disabled={!auth.entitlement?.canWriteCloud} />
          </section>
        </main>
      )
    }}</CloudGate>
  )
}
