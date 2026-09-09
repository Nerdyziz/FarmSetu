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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-green-100 bg-white/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌾</span>
          <div>
            <h1 className="text-2xl font-bold text-green-800 leading-none">{t('appName')}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{t('tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SupabaseStatusBadge />
          <button
            onClick={toggleLang}
            className="px-4 py-2 rounded-full border border-green-300 text-sm font-semibold text-green-700 bg-white hover:bg-green-50 transition"
          >
            {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            {t('selectRole')}
          </h2>
          <p className="text-gray-500 text-sm md:text-base max-w-md mx-auto">
            {lang === 'en'
              ? 'Select your role to enter the right portal'
              : 'सही पोर्टल में जाने के लिए अपनी भूमिका चुनें'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
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
                className={`group relative flex items-center gap-4 p-6 rounded-2xl border-2 ${role.border} ${role.bg} bg-white shadow-sm hover:shadow-lg transition-all duration-200 text-left ${selected === role.key ? 'scale-95 opacity-70' : ''}`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-3xl shadow-md flex-shrink-0`}
                >
                  {role.emoji}
                </div>
                <div>
                  <div className="font-bold text-gray-800 text-lg">{label}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {desc[role.key][lang]}
                  </div>
                </div>
                <span className="ml-auto text-gray-300 group-hover:text-gray-500 text-xl">→</span>
              </button>
            )
          })}
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
          {[
            { en: '312 Active Farmers', hi: '312 सक्रिय किसान', icon: '🧑‍🌾' },
            { en: '48.6 Tons This Week', hi: '48.6 टन इस हफ्ते', icon: '🍊' },
            { en: '70% Paid in 24h', hi: '70% 24 घंटे में', icon: '💰' },
            { en: '14.2% Spoilage (↓)', hi: '14.2% बर्बादी (↓)', icon: '📉' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xs font-semibold text-gray-700">{stat[lang]}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
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
