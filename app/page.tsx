'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LanguageProvider, useLang } from '@/lib/i18n/LanguageContext'
import SupabaseStatusBadge from '@/components/SupabaseStatusBadge'

const roles = [
  {
    key: 'farmer',
    emoji: '🧑‍🌾',
    color: 'from-orange-400 to-green-500',
    border: 'border-orange-400',
    bg: 'hover:bg-orange-50',
    path: '/farmer/dashboard',
  },
  {
    key: 'operator',
    emoji: '🏭',
    color: 'from-blue-500 to-indigo-600',
    border: 'border-blue-500',
    bg: 'hover:bg-blue-50',
    path: '/operator/dashboard',
  },
  {
    key: 'buyer',
    emoji: '🛒',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500',
    bg: 'hover:bg-emerald-50',
    path: '/buyer/browse',
  },
  {
    key: 'government',
    emoji: '🏛️',
    color: 'from-purple-600 to-violet-700',
    border: 'border-purple-600',
    bg: 'hover:bg-purple-50',
    path: '/government/dashboard',
  },
]

function LandingContent() {
  const { t, lang, toggleLang } = useLang()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex flex-col antialiased">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-green-100 bg-white/90 backdrop-blur sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-2xl sm:text-3xl flex-shrink-0">🌾</span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-green-800 leading-none truncate">{t('appName')}</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">{t('tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <SupabaseStatusBadge />
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-full border border-green-300 text-xs sm:text-sm font-semibold text-green-700 bg-white hover:bg-green-50 transition shadow-xs"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 EN'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-3 sm:px-6 py-6 sm:py-12 w-full">
        <div className="text-center mb-6 sm:mb-10 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-3">
            {t('selectRole')}
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm md:text-base max-w-md mx-auto">
            {lang === 'en'
              ? 'Select your role to enter the right portal'
              : 'सही पोर्टल में जाने के लिए अपनी भूमिका चुनें'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 w-full max-w-2xl">
          {roles.map((role) => {
            const label = t(role.key === 'farmer' ? 'farmerRole' : role.key as 'operator' | 'buyer' | 'government')
            const desc: Record<string, { en: string; hi: string }> = {
              farmer: {
                en: 'List produce · Get grade · Track payment',
                hi: 'फसल लगाएं · श्रेणी पाएं · पैसा देखें',
              },
              operator: {
                en: 'Manage lots · Quality analytics · Logistics',
                hi: 'लॉट प्रबंधन · गुणवत्ता विश्लेषण · लॉजिस्टिक्स',
              },
              buyer: {
                en: 'Browse certified lots · Place orders',
                hi: 'प्रमाणित लॉट देखें · ऑर्डर करें',
              },
              government: {
                en: 'Price monitoring · Shortage alerts · PMD',
                hi: 'मूल्य निगरानी · कमी अलर्ट · PMD',
              },
            }
            return (
              <button
                key={role.key}
                onClick={() => {
                  setSelected(role.key)
                  router.push(role.path)
                }}
                className={`group relative flex items-center gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl border-2 ${role.border} ${role.bg} bg-white shadow-sm hover:shadow-lg transition-all duration-200 text-left active:scale-98 ${selected === role.key ? 'scale-95 opacity-70' : ''}`}
              >
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-2xl sm:text-3xl shadow-md flex-shrink-0`}
                >
                  {role.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-800 text-base sm:text-lg truncate">{label}</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">
                    {desc[role.key][lang]}
                  </div>
                </div>
                <span className="ml-auto text-gray-300 group-hover:text-gray-500 text-lg sm:text-xl flex-shrink-0">→</span>
              </button>
            )
          })}
        </div>

        {/* Stats bar */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 w-full max-w-2xl">
          {[
            { en: '312 Active Farmers', hi: '312 सक्रिय किसान', icon: '🧑‍🌾' },
            { en: '48.6 Tons This Week', hi: '48.6 टन इस हफ्ते', icon: '🍊' },
            { en: '70% Paid in 24h', hi: '70% 24 घंटे में', icon: '💰' },
            { en: '14.2% Spoilage (↓)', hi: '14.2% बर्बादी (↓)', icon: '📉' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-2.5 sm:p-3 text-center shadow-xs">
              <div className="text-xl sm:text-2xl mb-1">{stat.icon}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-gray-700">{stat[lang]}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-4 text-[11px] sm:text-xs text-gray-400 px-4">
        FarmSetu · SIH 2026 · Team Vitality · Problem Statement ID26033
      </footer>
    </div>
  )
}

export default function HomePage() {
  return (
    <LanguageProvider defaultLang="hi">
      <LandingContent />
    </LanguageProvider>
  )
}
