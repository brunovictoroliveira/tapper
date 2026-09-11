import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { useAuth } from '../features/auth/hooks/useAuth.js'
import { listAdminBpmDetections } from '../services/bpmReportService.js'

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AdminBpmReportPage() {
  const auth = useAuth()
  const [detections, setDetections] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (auth.status !== 'ready' || !auth.entitlement?.isAdmin) return
    listAdminBpmDetections().then((data) => {
      setDetections(data)
      setStatus('ready')
    }).catch((requestError) => {
      setError(requestError.message)
      setStatus('error')
    })
  }, [auth.entitlement?.isAdmin, auth.status])

  if (auth.status === 'loading') return <main className="app-shell admin-shell"><Header /><p className="admin-state">Carregando…</p></main>
  if (!auth.session) return <main className="app-shell admin-shell"><Header /><section className="admin-state"><h1>Acesso restrito</h1><p>Entre com a conta administrativa para ver o relatório.</p><a className="primary-link" href="/login">Fazer login</a></section></main>
  if (!auth.entitlement?.isAdmin) return <main className="app-shell admin-shell"><Header /><section className="admin-state"><h1>Acesso restrito</h1><p>Esta área está disponível somente para a conta administrativa.</p><a className="primary-link" href="/">Voltar ao início</a></section></main>

  return (
    <main className="app-shell admin-shell">
      <Header action={<span className="topbar-label">ADMINISTRAÇÃO</span>} />
      <section className="admin-heading"><p className="eyebrow">RELATÓRIO DE DETECÇÕES</p><h1>BPM detectados</h1><p>Histórico de medições manuais e automáticas salvas pelos usuários.</p></section>
      {status === 'error' && <p className="error-message">{error}</p>}
      {status === 'loading' && <p className="admin-state">Carregando medições…</p>}
      {status === 'ready' && <section className="report-table-wrap"><table className="report-table"><thead><tr><th>Usuário</th><th>Música</th><th>Artista</th><th>BPM</th><th>Método</th><th>Data</th></tr></thead><tbody>{detections.map((detection) => <tr key={detection.id}><td>{detection.user_name || 'Sem nome'}</td><td>{detection.song_title}</td><td>{detection.artist || '—'}</td><td className="report-bpm">{Number(detection.bpm).toFixed(1)}</td><td>{detection.detection_method === 'automatic' ? 'Automática' : 'Manual'}</td><td>{formatDate(detection.detected_at)}</td></tr>)}</tbody></table>{!detections.length && <p className="admin-state">Ainda não há detecções salvas.</p>}</section>}
    </main>
  )
}
