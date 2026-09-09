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

function FarmerNav() {
  const { t, lang, toggleLang } = useLang()
  const pathname = usePathname()

  return (
    <div className="farmer-mode min-h-screen bg-orange-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-orange-500 to-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <div>
            <div className="font-bold text-lg leading-none">{t('appName')}</div>
            <div className="text-xs opacity-80">
              {lang === 'hi' ? 'किसान पोर्टल' : 'Farmer Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SupabaseStatusBadge />
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <Link
            href="/"
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-sm transition"
          >
            🏠
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24">
        {/* This will be filled by child pages */}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-200 grid grid-cols-4 shadow-lg z-50">
        {navItems.map((item) => {
          const active = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={clsx(
                'flex flex-col items-center py-3 text-xs font-semibold transition',
                active ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:text-orange-500'
              )}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight text-center px-1">
                {t(item.labelKey)}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

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
    <div className="farmer-mode min-h-screen bg-orange-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-orange-500 to-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌾</span>
          <div>
            <div className="font-bold text-lg leading-none">{t('appName')}</div>
            <div className="text-xs opacity-80">
              {lang === 'hi' ? 'किसान पोर्टल' : 'Farmer Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <Link href="/" className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-sm transition">
            ← {lang === 'hi' ? 'वापस' : 'Home'}
          </Link>
        </div>
      </header>

      {/* Content area */}
      <main className="flex-1 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-200 grid grid-cols-4 shadow-lg z-50">
        {navItems.map((item) => {
          const active = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={clsx(
                'flex flex-col items-center py-3 text-xs font-semibold transition',
                active ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:text-orange-500'
              )}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight text-center px-1">
                {t(item.labelKey)}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
