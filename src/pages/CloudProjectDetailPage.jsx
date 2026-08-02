import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { cloudProjectRepository } from '../repositories/cloudProjectRepository.js'
import { cloudSongRepository } from '../repositories/cloudSongRepository.js'
import { localProjectRepository } from '../repositories/localProjectRepository.js'
import { localSongRepository } from '../repositories/localSongRepository.js'

function ProjectContent({ projectId }) {
  const [project, setProject] = useState(null)
  const [versions, setVersions] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      cloudProjectRepository.findById(projectId),
      cloudProjectRepository.listVersions(projectId),
    ]).then(([record, history]) => { setProject(record); setVersions(history) })
      .catch((error) => setMessage(error.message))
  }, [projectId])

  async function restore() {
    try {
      let localSong = null
      if (project.songId) {
        const song = await cloudSongRepository.findById(project.songId)
        if (song) localSong = await localSongRepository.create({ ...song, id: undefined, cloudId: song.id, syncStatus: 'synced' })
      }
      const localProject = await localProjectRepository.create({
        cloudId: project.id,
        songId: localSong?.id || null,
        name: project.name,
        projectState: project.projectState,
        version: project.version,
        syncStatus: 'synced',
      })
      globalThis.location.href = `/key?project=${encodeURIComponent(localProject.id)}`
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="app-shell cloud-shell cloud-detail-shell">
      <Header action={<span className="topbar-label">PROJETO</span>} />
      <CloudNavigation />
      {!project && <p className="cloud-state">{message || 'Carregando projeto…'}</p>}
      {project && <section className="project-detail">
        <a href="/cloud/projects">← Projetos</a>
        <p className="eyebrow">VERSÃO {project.version}</p>
        <h1>{project.name}</h1>
        <dl>{Object.entries(project.projectState || {}).filter(([, value]) => typeof value !== 'object').map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>
        <button className="primary-button" type="button" onClick={restore}>Restaurar neste dispositivo</button>
        <div className="version-history"><strong>Histórico</strong>{versions.map((version) => <span key={version.id}>Versão {version.version} · {new Date(version.created_at).toLocaleString('pt-BR')}</span>)}</div>
        {message && <p className="account-message">{message}</p>}
      </section>}
    </main>
  )
}

export default function CloudProjectDetailPage({ projectId }) {
  return <CloudGate>{() => <ProjectContent projectId={projectId} />}</CloudGate>
}
