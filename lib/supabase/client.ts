import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  return { url, key }
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnv()
  return Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('placeholder') &&
    !key.includes('placeholder')
  )
}

export function createClient() {
  const { url, key } = getSupabaseEnv()
  return createBrowserClient(
    url || 'https://placeholder.supabase.co',
    key || 'placeholder'
  )
}
