'use client'
import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LanguageContext'

export default function SupabaseStatusBadge() {
  const { lang } = useLang()
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    setConfigured(isSupabaseConfigured())
  }, [])

  if (configured) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <span className="hidden sm:inline">Supabase: {lang === 'hi' ? 'कनेक्टेड' : 'Connected'}</span>
        <span className="sm:hidden">{lang === 'hi' ? 'लाइव' : 'Live'}</span>
      </span>
    )
  }

  return (
    <span
      title="Supabase URL & Anon Key not yet set in .env.local — Running in resilient Demo Mock Mode"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs cursor-help flex-shrink-0"
    >
      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
      <span className="hidden sm:inline">{lang === 'hi' ? 'डेमो मोड (Supabase कनेक्ट करें)' : 'Demo Mode (Connect Supabase)'}</span>
      <span className="sm:hidden">{lang === 'hi' ? 'डेमो' : 'Demo'}</span>
    </span>
  )
}
