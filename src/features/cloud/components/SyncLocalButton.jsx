import { useState } from 'react'
import { syncLocalLibrary } from '../../../services/syncService.js'

export function SyncLocalButton({ disabled = false, onComplete }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function synchronize() {
    setStatus('syncing')
    setMessage('Preparando sincronização…')
    try {
      const result = await syncLocalLibrary({
        onProgress: ({ completed, total }) => setMessage(`Sincronizando ${completed} de ${total}…`),
      })
      setMessage(result.failures
        ? `${result.failures} item(ns) ficaram pendentes para uma nova tentativa.`
        : result.total ? `${result.total} item(ns) sincronizados.` : 'Tudo já está sincronizado.')
      onComplete?.(result)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="sync-action">
      <button className="primary-button" type="button" disabled={disabled || status === 'syncing'} onClick={synchronize}>
        {status === 'syncing' ? 'Sincronizando…' : 'Sincronizar histórico local'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  )
}
