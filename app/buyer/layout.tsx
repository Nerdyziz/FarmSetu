'use client'
import Link from 'next/link'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'

function BuyerLayoutInner({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang } = useLang()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛒</span>
          <div>
            <div className="font-bold text-lg">FarmSetu</div>
            <div className="text-xs opacity-70">{lang === 'hi' ? 'खरीदार पोर्टल' : 'Buyer Marketplace'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleLang} className="px-3 py-1 rounded-full bg-white/20 text-sm hover:bg-white/30 transition">
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <Link href="/" className="text-sm opacity-70 hover:opacity-100">← {lang === 'hi' ? 'वापस' : 'Home'}</Link>
        </div>
      </header>
      <div className="flex border-b border-gray-200 bg-white px-6">
        {[
          { href: '/buyer/browse', label: { en: 'Browse Lots', hi: 'लॉट देखें' }, icon: '🍊' },
          { href: '/buyer/orders', label: { en: 'My Orders', hi: 'मेरे ऑर्डर' }, icon: '📋' },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600 hover:text-emerald-700 border-b-2 border-transparent hover:border-emerald-600 transition">
            {item.icon} {item.label[lang]}
          </Link>
        ))}
      </div>
      <main className="p-6">{children}</main>
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
