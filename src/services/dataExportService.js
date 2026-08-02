import { getSupabaseClient } from '../lib/supabaseClient.js'
import { exportLocalData } from './localBackupService.js'
import { cloudStorageService } from './cloudStorageService.js'

function download(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function safeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180) || 'audio'
}

export async function collectCloudData() {
  const supabase = getSupabaseClient()
  const [profile, subscriptions, songs, projects, versions, files] = await Promise.all([
    supabase.from('profiles').select('*').single(),
    supabase.from('subscriptions').select('*').order('created_at'),
    supabase.from('songs').select('*').order('created_at'),
    supabase.from('projects').select('*').order('created_at'),
    supabase.from('project_versions').select('*').order('created_at'),
    supabase.from('cloud_files').select('*').eq('status', 'ready').order('created_at'),
  ])
  for (const result of [profile, subscriptions, songs, projects, versions, files]) {
    if (result.error) throw new Error(result.error.message)
  }
  return {
    format: 'tapper-cloud-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    subscriptions: subscriptions.data,
    songs: songs.data,
    projects: projects.data,
    projectVersions: versions.data,
    files: files.data,
  }
}

export async function exportAllAsJson() {
  const [cloud, localContents] = await Promise.all([collectCloudData(), exportLocalData()])
  const data = JSON.stringify({ cloud, local: JSON.parse(localContents) }, null, 2)
  download(data, `tapper-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
}

export async function exportAllAsZip(onProgress) {
  const [{ default: JSZip }, cloud, localContents] = await Promise.all([
    import('jszip'), collectCloudData(), exportLocalData(),
  ])
  const zip = new JSZip()
  zip.file('cloud-data.json', JSON.stringify(cloud, null, 2))
  zip.file('local-backup.json', localContents)
  for (let index = 0; index < cloud.files.length; index += 1) {
    const file = cloud.files[index]
    onProgress?.(`Baixando arquivo ${index + 1} de ${cloud.files.length}…`)
    const response = await fetch(await cloudStorageService.createDownloadUrl(file.id))
    if (!response.ok) throw new Error(`Não foi possível exportar ${file.original_name}.`)
    zip.file(`audio/${file.id}-${safeFilename(file.original_name)}`, await response.blob())
  }
  onProgress?.('Montando arquivo ZIP…')
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 } })
  download(blob, `tapper-export-${new Date().toISOString().slice(0, 10)}.zip`, 'application/zip')
}
