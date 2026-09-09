'use client'
import Link from 'next/link'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'

function BuyerLayoutInner({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang } = useLang()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-emerald-700 via-teal-700 to-teal-800 text-white px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between shadow-md sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">🛒</span>
          <div className="min-w-0">
            <div className="font-bold text-base sm:text-lg truncate">FarmSetu</div>
            <div className="text-[11px] sm:text-xs opacity-80 truncate">{lang === 'hi' ? 'खरीदार पोर्टल' : 'Buyer Marketplace'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button onClick={toggleLang} className="px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-white/20 text-xs sm:text-sm hover:bg-white/30 transition font-medium">
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
          </button>
          <Link href="/" className="text-xs sm:text-sm opacity-80 hover:opacity-100 px-2 py-1 flex items-center gap-1">
            <span>←</span>
            <span className="hidden xs:inline">{lang === 'hi' ? 'वापस' : 'Home'}</span>
          </Link>
        </div>
      </header>
      <div className="flex border-b border-gray-200 bg-white px-3 sm:px-6 overflow-x-auto scrollbar-none whitespace-nowrap sticky top-[53px] sm:top-[60px] z-30 shadow-xs">
        {[
          { href: '/buyer/browse', label: { en: 'Browse Lots', hi: 'लॉट देखें' }, icon: '🍊' },
          { href: '/buyer/orders', label: { en: 'My Orders', hi: 'मेरे ऑर्डर' }, icon: '📋' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-gray-600 hover:text-emerald-700 border-b-2 border-transparent hover:border-emerald-600 transition flex-shrink-0">
            <span>{item.icon}</span>
            <span>{item.label[lang]}</span>
          </Link>
        ))}
      </div>
      <main className="p-3 sm:p-5 lg:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  )
}

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider defaultLang="en">
      <BuyerLayoutInner>{children}</BuyerLayoutInner>
    </LanguageProvider>
  )
}
