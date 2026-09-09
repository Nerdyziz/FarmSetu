'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'
import { clsx } from 'clsx'
import SupabaseStatusBadge from '@/components/SupabaseStatusBadge'

const navItems = [
  { path: '/operator/dashboard', label: { en: 'Dashboard', hi: 'डैशबोर्ड' }, icon: '📊' },
  { path: '/operator/quality', label: { en: 'Quality', hi: 'गुणवत्ता' }, icon: '🔬' },
  { path: '/operator/truck-booking', label: { en: 'Book Truck', hi: 'ट्रक बुक करें' }, icon: '🚛' },
  { path: '/operator/processor-bids', label: { en: 'Processor Bids', hi: 'प्रोसेसर बोलियाँ' }, icon: '🏭' },
  { path: '/operator/logistics', label: { en: 'Logistics', hi: 'लॉजिस्टिक्स' }, icon: '🚚' },
]

function OperatorLayoutInner({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang } = useLang()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 text-white px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-lg sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">🏭</span>
          <div className="min-w-0">
            <div className="font-bold text-base sm:text-lg leading-none truncate">FarmSetu</div>
            <div className="text-[11px] sm:text-xs opacity-80 truncate">
              {lang === 'hi' ? 'PACS संचालक पोर्टल' : 'PACS Operator Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <SupabaseStatusBadge />
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs sm:text-sm font-semibold transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <Link href="/" className="text-xs sm:text-sm opacity-80 hover:opacity-100 transition px-2 py-1 rounded-lg hover:bg-white/10 flex items-center gap-1">
            <span>←</span>
            <span className="hidden xs:inline">{lang === 'hi' ? 'वापस' : 'Home'}</span>
          </Link>
        </div>
      </header>

      {/* Nav tabs with smooth touch horizontal scroll */}
      <div className="bg-white border-b border-blue-100 px-3 sm:px-6 flex gap-1 sm:gap-2 overflow-x-auto scrollbar-none whitespace-nowrap sticky top-[53px] sm:top-[60px] z-30 shadow-xs">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={clsx(
              'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition flex-shrink-0 select-none',
              pathname === item.path
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300'
            )}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label[lang]}</span>
          </Link>
        ))}
      </div>

      <main className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  )
}

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider defaultLang="en">
      <OperatorLayoutInner>{children}</OperatorLayoutInner>
    </LanguageProvider>
  )
}
