import { useEffect, useState } from 'react'
import Header from '../components/Header.jsx'
import { CloudGate, CloudNavigation } from '../features/cloud/components/CloudGate.jsx'
import { cloudProjectRepository } from '../repositories/cloudProjectRepository.js'

function CloudProjectsContent() {
  const [projects, setProjects] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    cloudProjectRepository.list().then(setProjects).catch((error) => setMessage(error.message))
  }, [])

  return (
    <main className="app-shell cloud-shell cloud-list-shell">
        <Header action={<span className="topbar-label">PROJETOS</span>} />
        <CloudNavigation />
        <section className="cloud-list-heading"><div><p className="eyebrow">ESTADOS RESTAURÁVEIS</p><h1>Seus projetos</h1></div><span>{projects.length} de 50</span></section>
        {!projects.length && <p className="cloud-state">{message || 'Nenhum projeto salvo na nuvem.'}</p>}
        <ul className="cloud-song-list project-list">
          {projects.map((project) => <li key={project.id}><span className="history-key">v{project.version}</span><a href={`/cloud/projects/${project.id}`}><strong>{project.name}</strong><small>{new Date(project.updatedAt).toLocaleString('pt-BR')}</small></a><span>{project.projectState?.detectedKey || '—'}</span></li>)}
        </ul>
    </main>
  )
}

export default function CloudProjectsPage() {
  return <CloudGate>{() => <CloudProjectsContent />}</CloudGate>
}
