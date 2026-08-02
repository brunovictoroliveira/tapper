import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { getSupabaseClient } from '../lib/supabaseClient.js'
import { cloudStorageService } from '../services/cloudStorageService.js'

function formatBytes(bytes) {
  return `${(Number(bytes) / 1024 / 1024).toFixed(1)} MB`
}

function StorageContent({ auth }) {
  const [files, setFiles] = useState([])
  const [message, setMessage] = useState('')

  async function load() {
    const { data, error } = await getSupabaseClient().from('cloud_files').select('*').order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setFiles(data)
  }

  useEffect(() => { load() }, [])
  const profile = auth.entitlement?.profile
  return (
    <main className="app-shell cloud-shell cloud-list-shell">
      <Header action={<span className="topbar-label">ARMAZENAMENTO</span>} />
      <CloudNavigation />
      <section className="cloud-list-heading"><div><p className="eyebrow">COTA CLOUD</p><h1>Seus arquivos</h1></div><span>{formatBytes(profile?.storage_used_bytes || 0)} de {formatBytes(profile?.storage_quota_bytes || 0)}</span></section>
      {!files.length && <p className="cloud-state">{message || 'Nenhum arquivo armazenado.'}</p>}
      <ul className="cloud-song-list storage-list">{files.map((file) => <li key={file.id}><span className="history-key">{file.status === 'ready' ? '✓' : '…'}</span><span><strong>{file.original_name}</strong><small>{file.mime_type}</small></span><span>{formatBytes(file.size_bytes)}</span><button type="button" onClick={async () => { await cloudStorageService.remove(file.id); load() }}>×</button></li>)}</ul>
    </main>
  )
}

export default function StoragePage() {
  return <CloudGate>{({ auth }) => <StorageContent auth={auth} />}</CloudGate>
}
