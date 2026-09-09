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
      <header className="bg-gray-900 border-b border-purple-800 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">🏛️</span>
          <div className="min-w-0">
            <div className="font-bold text-base sm:text-lg leading-none text-purple-200 truncate">FarmSetu</div>
            <div className="text-[11px] sm:text-xs text-purple-400 truncate">
              {lang === 'hi' ? 'DoCA / PMD निगरानी पोर्टल' : 'DoCA / PMD Monitoring Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="hidden xs:inline">{lang === 'hi' ? 'लाइव' : 'Live'}</span>
          </div>
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-purple-900 hover:bg-purple-800 text-xs sm:text-sm text-purple-200 transition font-medium"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
          </button>
          <Link href="/" className="text-xs sm:text-sm text-gray-400 hover:text-gray-200 transition px-2 py-1 flex items-center gap-1">
            <span>←</span>
            <span className="hidden xs:inline">{lang === 'hi' ? 'वापस' : 'Home'}</span>
          </Link>
        </div>
      </header>
      <main className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full">{children}</main>
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
