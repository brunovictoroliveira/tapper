import { getSupabaseClient } from '../lib/supabaseClient.js'

async function request(name, method = 'POST') {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw new Error(error.message)
  if (!data.session?.access_token) throw new Error('Entre na sua conta para gerenciar a assinatura.')
  const response = await fetch(`/.netlify/functions/${name}`, {
    method,
    headers: { authorization: `Bearer ${data.session.access_token}` },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar a assinatura.')
  return result
}

export const subscriptionService = {
  create: () => request('create-subscription'),
  cancel: () => request('cancel-subscription'),
  status: () => request('subscription-status', 'GET'),
}
