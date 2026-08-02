import { createClient } from '@supabase/supabase-js'

const environment = import.meta.env || {}
const supabaseUrl = environment.VITE_SUPABASE_URL
const supabaseAnonKey = environment.VITE_SUPABASE_ANON_KEY

let client

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('O Tapper Cloud ainda não foi configurado neste ambiente.')
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
