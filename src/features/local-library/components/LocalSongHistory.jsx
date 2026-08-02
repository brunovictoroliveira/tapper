import { useRef } from 'react'

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function LocalSongHistory({
  songs,
  status,
  message,
  onRemove,
  onExport,
  onImport,
}) {
  const importInputRef = useRef(null)

  return (
    <section className="local-history" aria-labelledby="local-history-title">
      <div className="local-history-heading">
        <div>
          <p className="eyebrow">SALVO NESTE DISPOSITIVO</p>
          <h2 id="local-history-title">Histórico local</h2>
        </div>
        <span>{songs.length}</span>
      </div>

      <div className="history-actions">
        <button type="button" onClick={onExport} disabled={!songs.length}>Exportar JSON</button>
        <button type="button" onClick={() => importInputRef.current?.click()}>Importar JSON</button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            onImport(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      {status === 'loading' && <p className="history-empty">Carregando histórico…</p>}
      {status !== 'loading' && !songs.length && (
        <p className="history-empty">As análises concluídas aparecerão aqui e continuarão disponíveis offline.</p>
      )}

      {!!songs.length && (
        <ul className="history-list">
          {songs.slice(0, 8).map((song) => (
            <li key={song.id}>
              <span className="history-key">{song.manualKey || song.detectedKey}</span>
              <span className="history-song">
                <strong>{song.title}</strong>
                <small>{formatDate(song.analyzedAt)}</small>
              </span>
              <button type="button" onClick={() => onRemove(song.id)} aria-label={`Excluir ${song.title}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {message && <p className="history-message" role="status">{message}</p>}
    </section>
  )
}
