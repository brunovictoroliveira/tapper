import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient.js'

function resultOrThrow({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

export async function saveBpmDetection({ songTitle, artist, bpm, method }) {
  if (!isSupabaseConfigured()) throw new Error('A persistência de relatórios ainda não foi configurada neste ambiente.')
  const supabase = getSupabaseClient()
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session?.user) throw new Error('Entre na sua conta para salvar esta detecção.')
  return resultOrThrow(await supabase.from('bpm_detections').insert({
    user_id: sessionData.session.user.id,
    song_title: songTitle.trim(),
    artist: artist.trim(),
    bpm: Number(bpm),
    detection_method: method,
  }).select().single())
}

export async function listAdminBpmDetections() {
  if (!isSupabaseConfigured()) throw new Error('O Supabase ainda não foi configurado neste ambiente.')
  return resultOrThrow(await getSupabaseClient().rpc('admin_bpm_detection_report'))
}
