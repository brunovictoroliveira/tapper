import { runTransaction } from '../storage/tapperDatabase.js'

function createId() {
  return globalThis.crypto?.randomUUID?.() || `project-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizeLocalProject(project, existing = null) {
  const timestamp = new Date().toISOString()
  return {
    id: existing?.id || project.id || createId(),
    cloudId: project.cloudId || existing?.cloudId || null,
    songId: project.songId || null,
    name: typeof project.name === 'string' && project.name.trim() ? project.name.trim() : 'Projeto sem título',
    projectState: project.projectState && typeof project.projectState === 'object' ? project.projectState : {},
    version: Math.max(1, Math.round(Number(project.version) || 1)),
    syncStatus: project.syncStatus || existing?.syncStatus || 'local',
    syncError: typeof project.syncError === 'string' ? project.syncError : '',
    createdAt: existing?.createdAt || project.createdAt || timestamp,
    updatedAt: timestamp,
  }
}

export const localProjectRepository = {
  async create(project) {
    const record = normalizeLocalProject(project)
    await runTransaction(['projects'], 'readwrite', (transaction) => {
      transaction.objectStore('projects').add(record)
    })
    return record
  },

  async findById(id) {
    return runTransaction(['projects'], 'readonly', (transaction, toPromise) => (
      toPromise(transaction.objectStore('projects').get(id))
    ))
  },

  async list() {
    const projects = await runTransaction(['projects'], 'readonly', (transaction, toPromise) => (
      toPromise(transaction.objectStore('projects').getAll())
    ))
    return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  },

  async update(id, changes) {
    const existing = await this.findById(id)
    if (!existing) throw new Error('Projeto não encontrado no armazenamento local.')
    const record = normalizeLocalProject({ ...existing, ...changes }, existing)
    await runTransaction(['projects'], 'readwrite', (transaction) => {
      transaction.objectStore('projects').put(record)
    })
    return record
  },

  async remove(id) {
    await runTransaction(['projects'], 'readwrite', (transaction) => {
      transaction.objectStore('projects').delete(id)
    })
  },

  async upsertMany(projects) {
    await runTransaction(['projects'], 'readwrite', (transaction) => {
      const store = transaction.objectStore('projects')
      projects.forEach((project) => store.put(normalizeLocalProject(project)))
    })
  },
}
