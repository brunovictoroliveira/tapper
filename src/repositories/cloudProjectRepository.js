import { getSupabaseClient } from '../lib/supabaseClient.js'

function unwrap(result) {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

async function currentUserId() {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
  if (!data.session?.user) throw new Error('Entre na sua conta para usar o Tapper Cloud.')
  return data.session.user.id
}

export function fromCloudProjectRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    clientReference: row.client_reference,
    songId: row.song_id,
    name: row.name,
    projectState: row.project_state,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
  }
}

export const cloudProjectRepository = {
  async create(project) {
    const userId = await currentUserId()
    if (project.clientReference) {
      const existing = unwrap(await getSupabaseClient()
        .from('projects')
        .select('*')
        .eq('client_reference', project.clientReference)
        .maybeSingle())
      if (existing) return fromCloudProjectRow(existing)
    }
    const data = unwrap(await getSupabaseClient().from('projects').insert({
      user_id: userId,
      client_reference: project.clientReference || null,
      song_id: project.songId || null,
      name: project.name,
      project_state: project.projectState || {},
    }).select().single())
    return fromCloudProjectRow(data)
  },

  async findById(id) {
    return fromCloudProjectRow(unwrap(
      await getSupabaseClient().from('projects').select('*').eq('id', id).maybeSingle(),
    ))
  },

  async list() {
    const data = unwrap(await getSupabaseClient()
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50))
    return data.map(fromCloudProjectRow)
  },

  async update(id, changes) {
    const update = {}
    if (changes.songId !== undefined) update.song_id = changes.songId
    if (changes.name !== undefined) update.name = changes.name
    if (changes.projectState !== undefined) update.project_state = changes.projectState
    const data = unwrap(await getSupabaseClient()
      .from('projects')
      .update(update)
      .eq('id', id)
      .select()
      .single())
    return fromCloudProjectRow(data)
  },

  async remove(id) {
    unwrap(await getSupabaseClient().from('projects').delete().eq('id', id))
  },

  async listVersions(projectId) {
    return unwrap(await getSupabaseClient()
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: false })
      .limit(5))
  },
}
