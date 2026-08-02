import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { cloudSongRepository } from '../repositories/cloudSongRepository.js'
import { cloudStorageService } from '../services/cloudStorageService.js'

function CloudSongDetailContent({ auth, songId }) {
  const [song, setSong] = useState(null)
  const [message, setMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(null)

  useEffect(() => {
    cloudSongRepository.findById(songId).then(setSong).catch((error) => setMessage(error.message))
  }, [songId])

  function change(property, value) {
    setSong((current) => ({ ...current, [property]: value }))
  }

  async function save(event) {
    event.preventDefault()
    try {
      setSong(await cloudSongRepository.update(songId, {
        title: song.title,
        artist: song.artist,
        album: song.album,
        manualKey: song.manualKey,
        bpm: song.bpm === '' ? null : Number(song.bpm),
        notes: song.notes,
        tags: typeof song.tags === 'string' ? song.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : song.tags,
      }))
      setMessage('Alterações salvas na nuvem.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function uploadAudio(file) {
    if (!file) return
    setMessage('Preparando áudio…')
    try {
      const result = await cloudStorageService.uploadSongAudio(songId, file, (fraction) => {
        setUploadProgress(Math.round(fraction * 100))
      })
      setSong((current) => ({ ...current, audioFileId: result.file.id }))
      setMessage('Áudio guardado na nuvem.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setUploadProgress(null)
    }
  }

  async function downloadAudio() {
    try {
      globalThis.location.href = await cloudStorageService.createDownloadUrl(song.audioFileId)
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function removeAudio() {
    try {
      await cloudStorageService.remove(song.audioFileId)
      setSong((current) => ({ ...current, audioFileId: null }))
      setMessage('Áudio removido da nuvem.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="app-shell cloud-shell cloud-detail-shell">
        <Header action={<span className="topbar-label">MÚSICA</span>} />
        <CloudNavigation />
        {!song && <p className="cloud-state">{message || 'Carregando música…'}</p>}
        {song && <form className="cloud-editor" onSubmit={save}>
          <a href="/cloud/songs">← Biblioteca</a>
          <p className="eyebrow">{song.detectedKey} {song.detectedMode === 'major' ? 'MAIOR' : 'MENOR'} · {Math.round(song.detectionConfidence * 100)}%</p>
          <label>Título<input required value={song.title} onChange={(event) => change('title', event.target.value)} /></label>
          <div className="field-row">
            <label>Artista<input value={song.artist} onChange={(event) => change('artist', event.target.value)} /></label>
            <label>Álbum<input value={song.album} onChange={(event) => change('album', event.target.value)} /></label>
          </div>
          <div className="field-row">
            <label>Correção manual<input value={song.manualKey} onChange={(event) => change('manualKey', event.target.value)} placeholder="Ex.: C#m" /></label>
            <label>BPM<input type="number" min="1" max="999" step="0.01" value={song.bpm ?? ''} onChange={(event) => change('bpm', event.target.value)} /></label>
          </div>
          <label>Tags<input value={Array.isArray(song.tags) ? song.tags.join(', ') : song.tags} onChange={(event) => change('tags', event.target.value)} placeholder="ensaio, referência" /></label>
          <label>Notas<textarea rows="6" value={song.notes} onChange={(event) => change('notes', event.target.value)} /></label>
          <section className="cloud-audio-field">
            <div><strong>Áudio na nuvem</strong><span>Opcional · máximo de 100 MB</span></div>
            {!song.audioFileId && <label className="secondary-button">Selecionar áudio<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/webm,audio/ogg" disabled={!auth.entitlement?.canWriteCloud || uploadProgress !== null} onChange={(event) => uploadAudio(event.target.files?.[0])} /></label>}
            {song.audioFileId && <div className="cloud-file-actions"><button type="button" onClick={downloadAudio}>Baixar</button><button type="button" onClick={removeAudio}>Excluir áudio</button></div>}
            {uploadProgress !== null && <progress max="100" value={uploadProgress}>{uploadProgress}%</progress>}
          </section>
          <button className="primary-button" type="submit" disabled={!auth.entitlement?.canWriteCloud}>Salvar alterações</button>
          {message && <p className="account-message" role="status">{message}</p>}
        </form>}
    </main>
  )
}

export default function CloudSongDetailPage({ songId }) {
  return <CloudGate>{({ auth }) => <CloudSongDetailContent auth={auth} songId={songId} />}</CloudGate>
}
