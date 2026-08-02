import { getSupabaseClient } from '../lib/supabaseClient.js'

export async function deleteAccount(email) {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
  const response = await fetch('/.netlify/functions/delete-account', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token}` },
    body: JSON.stringify({ confirmation: 'EXCLUIR', email }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Não foi possível excluir a conta.')
  await getSupabaseClient().auth.signOut({ scope: 'local' })
  return result
}
