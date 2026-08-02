import { handleError, json, methodNotAllowed } from './_shared/http.js'
import { getSupabaseAdmin, requireUser } from './_shared/supabaseAdmin.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') return methodNotAllowed('GET')
  try {
    const user = await requireUser(event)
    const { data, error } = await getSupabaseAdmin().from('subscriptions').select('*')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return json(200, { subscription: data })
  } catch (error) {
    return handleError(error)
  }
}
