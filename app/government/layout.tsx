'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'
import { clsx } from 'clsx'

function GovLayoutInner({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang } = useLang()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-purple-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div>
            <div className="font-bold text-lg leading-none text-purple-200">FarmSetu</div>
            <div className="text-xs text-purple-400">
              {lang === 'hi' ? 'DoCA / PMD निगरानी पोर्टल' : 'DoCA / PMD Monitoring Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {lang === 'hi' ? 'लाइव' : 'Live'}
          </div>
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-full bg-purple-900 hover:bg-purple-800 text-sm text-purple-200 transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-200 transition">
            ← {lang === 'hi' ? 'वापस' : 'Home'}
          </Link>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}

export default function GovernmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider defaultLang="en">
      <GovLayoutInner>{children}</GovLayoutInner>
    </LanguageProvider>
  )
}
