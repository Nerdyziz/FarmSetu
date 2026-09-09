'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'
import { clsx } from 'clsx'
import SupabaseStatusBadge from '@/components/SupabaseStatusBadge'

const navItems = [
  { path: '/farmer/dashboard', labelKey: 'farmerDashboard' as const, icon: '🏠' },
  { path: '/farmer/new-lot', labelKey: 'newLot' as const, icon: '➕' },
  { path: '/farmer/harvest-slot', labelKey: 'harvestDay' as const, icon: '📅' },
  { path: '/farmer/payments', labelKey: 'paymentStatus' as const, icon: '💰' },
]

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider defaultLang="hi">
      <FarmerLayoutInner>{children}</FarmerLayoutInner>
    </LanguageProvider>
  )
}

function FarmerLayoutInner({ children }: { children: React.ReactNode }) {
  const { t, lang, toggleLang } = useLang()
  const pathname = usePathname()

  return (
    <div className="farmer-mode min-h-screen bg-orange-50/50 flex flex-col antialiased">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-orange-500 via-amber-600 to-green-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">🌾</span>
          <div className="min-w-0">
            <div className="font-bold text-base sm:text-lg leading-none truncate">{t('appName')}</div>
            <div className="text-[11px] sm:text-xs opacity-90 truncate">
              {lang === 'hi' ? 'किसान पोर्टल' : 'Farmer Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <SupabaseStatusBadge />
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs sm:text-sm font-semibold transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
          </button>
          <Link
            href="/"
            className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs sm:text-sm transition flex items-center gap-1"
          >
            <span>←</span>
            <span className="hidden xs:inline">{lang === 'hi' ? 'वापस' : 'Home'}</span>
          </Link>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 pb-28 overflow-y-auto w-full">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-orange-200 shadow-xl z-50">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {navItems.map((item) => {
            const active = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                className={clsx(
                  'flex flex-col items-center py-2.5 sm:py-3 text-xs font-semibold transition active:scale-95 select-none',
                  active
                    ? 'text-orange-600 bg-orange-50/70 border-t-2 border-orange-600 font-bold'
                    : 'text-gray-500 hover:text-orange-500 hover:bg-orange-50/30'
                )}
              >
                <span className="text-xl sm:text-2xl mb-0.5">{item.icon}</span>
                <span className="text-[10px] sm:text-[11px] leading-tight text-center px-0.5 line-clamp-1">
                  {t(item.labelKey)}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
