import { useCallback, useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { cloudSongRepository } from '../repositories/cloudSongRepository.js'
import { cloudStorageService } from '../services/cloudStorageService.js'

function CloudSongsContent({ auth }) {
  const [songs, setSongs] = useState([])
  const [search, setSearch] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const loadSongs = useCallback(async () => {
    setLoading(true)
    try {
      setSongs(await cloudSongRepository.list({ search, key: keyFilter }))
      setMessage('')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }, [keyFilter, search])

  useEffect(() => {
    const timer = window.setTimeout(loadSongs, 200)
    return () => window.clearTimeout(timer)
  }, [loadSongs])

  async function removeSong(song) {
    try {
      if (song.audioFileId) await cloudStorageService.remove(song.audioFileId)
      await cloudSongRepository.remove(song.id)
      await loadSongs()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="app-shell cloud-shell cloud-list-shell">
        <Header action={<span className="topbar-label">MÚSICAS</span>} />
        <CloudNavigation />
        <section className="cloud-list-heading">
          <div><p className="eyebrow">TAPPER CLOUD</p><h1>Suas músicas</h1></div>
          <span>{songs.length} de 500</span>
        </section>
        <section className="cloud-filters">
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título ou artista" />
          <select value={keyFilter} onChange={(event) => setKeyFilter(event.target.value)} aria-label="Filtrar por tonalidade">
            <option value="">Todas as tonalidades</option>
            {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((key) => <option key={key}>{key}</option>)}
          </select>
        </section>
        {loading && <p className="cloud-state">Carregando…</p>}
        {!loading && !songs.length && <p className="cloud-state">Nenhuma música encontrada.</p>}
        <ul className="cloud-song-list">
          {songs.map((song) => (
            <li key={song.id}>
              <span className="history-key">{song.manualKey || song.detectedKey || '—'}</span>
              <a href={`/cloud/songs/${song.id}`}><strong>{song.title}</strong><small>{song.artist || 'Artista não informado'}</small></a>
              <span>{song.bpm ? `${song.bpm} BPM` : song.detectedMode}</span>
              {auth.entitlement?.canWriteCloud && <button type="button" onClick={() => removeSong(song)} aria-label={`Excluir ${song.title}`}>×</button>}
            </li>
          ))}
        </ul>
        {message && <p className="error-message" role="alert">{message}</p>}
    </main>
  )
}

export default function CloudSongsPage() {
  return <CloudGate>{({ auth }) => <CloudSongsContent auth={auth} />}</CloudGate>
}
