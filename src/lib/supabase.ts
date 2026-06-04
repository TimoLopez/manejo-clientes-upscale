import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _supabase = createClient<any>(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> = new Proxy({} as SupabaseClient<any>, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})
