'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'
import { clsx } from 'clsx'

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
      {/* Sidebar for larger screens / Top bar for mobile */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏭</span>
          <div>
            <div className="font-bold text-lg leading-none">FarmSetu</div>
            <div className="text-xs opacity-70">
              {lang === 'hi' ? 'PACS संचालक पोर्टल' : 'PACS Operator Portal'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-sm font-semibold transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
          <Link href="/" className="text-sm opacity-70 hover:opacity-100 transition">
            ← {lang === 'hi' ? 'वापस' : 'Home'}
          </Link>
        </div>
      </header>

      {/* Nav tabs */}
      <div className="bg-white border-b border-blue-100 px-6 flex gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={clsx(
              'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition',
              pathname === item.path
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300'
            )}
          >
            <span>{item.icon}</span>
            <span>{item.label[lang]}</span>
          </Link>
        ))}
      </div>

      <main className="p-6">{children}</main>
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
