import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient.js'

function resultOrThrow({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

export const authService = {
  isConfigured: isSupabaseConfigured,

  async signUp({ email, password, displayName = '' }) {
    const response = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${globalThis.location?.origin || ''}/`,
      },
    })
    return resultOrThrow(response)
  },

  async signIn({ email, password }) {
    return resultOrThrow(await getSupabaseClient().auth.signInWithPassword({ email, password }))
  },

  async requestPasswordReset(email) {
    const redirectTo = `${globalThis.location?.origin || ''}/account/reset-password`
    return resultOrThrow(await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo }))
  },

  async updatePassword(password) {
    return resultOrThrow(await getSupabaseClient().auth.updateUser({ password }))
  },

  async signOut() {
    return resultOrThrow(await getSupabaseClient().auth.signOut())
  },

  async getSession() {
    const { session } = resultOrThrow(await getSupabaseClient().auth.getSession())
    return session
  },

  onAuthStateChange(callback) {
    if (!isSupabaseConfigured()) return () => {}
    const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => callback(session, event))
    return () => data.subscription.unsubscribe()
  },
}
