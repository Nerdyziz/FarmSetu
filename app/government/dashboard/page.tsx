'use client'
import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { useLang } from '@/lib/i18n/LanguageContext'
import { generatePriceForecast, generateArrivalData, CORRIDOR_STATS } from '@/lib/mock-data'
import { fetchPriceForecasts, fetchLots, LotRecord } from '@/lib/supabase/services'

export default function GovernmentDashboard() {
  const { t, lang } = useLang()
  const [forecast, setForecast] = useState<any[]>(generatePriceForecast())
  const [lots, setLots] = useState<LotRecord[]>([])
  const arrivals = generateArrivalData()

  useEffect(() => {
    async function loadGovData() {
      const [fRes, lRes] = await Promise.all([
        fetchPriceForecasts('Orange', 'Nagpur→Mumbai'),
        fetchLots(),
      ])
      setForecast(fRes.forecasts)
      setLots(lRes.lots)
    }
    loadGovData()
  }, [])

  const totalVolumeTons = (lots.reduce((acc, l) => acc + l.weightKg, 0) / 1000).toFixed(1)

  const kpis = [
    { label: { en: 'Active Farmers', hi: 'सक्रिय किसान' }, value: CORRIDOR_STATS.activeFarmers, icon: '🧑‍🌾', color: 'text-green-400' },
    { label: { en: 'Total Volume (tons)', hi: 'कुल माल (टन)' }, value: totalVolumeTons || CORRIDOR_STATS.totalVolumeTons, icon: '⚖️', color: 'text-blue-400' },
    { label: { en: 'Avg Farmer Share', hi: 'किसान का हिस्सा' }, value: `${CORRIDOR_STATS.avgFarmerSharePct}%`, icon: '📊', color: 'text-purple-400' },
    { label: { en: 'Spoilage Rate', hi: 'बर्बादी दर' }, value: `${CORRIDOR_STATS.spoilageRatePct}%`, icon: '📉', color: 'text-yellow-400' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-purple-100">{t('govDashboard')}</h1>
        <div className="text-sm text-gray-400">
          {lang === 'hi' ? 'नागपुर → मुंबई कॉरिडोर · लाइव डेटा' : 'Nagpur → Mumbai Corridor · Live Data'}
        </div>
      </div>

      {/* Shortage alert */}
      <div className="bg-red-950 border border-red-700 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div>
          <div className="font-bold text-red-300 text-lg">
            {lang === 'hi' ? 'कमी अलर्ट — संतरा' : 'Shortage Alert — Orange'}
          </div>
          <div className="text-red-400 text-sm mt-1">
            {lang === 'hi'
              ? 'मुंबई में संतरे की आपूर्ति अगले 7 दिनों में 18% कम होने का अनुमान है। PSF बफर रिलीज की सिफारिश।'
              : 'Orange supply in Mumbai forecast to drop 18% over next 7 days. Recommend PSF buffer release.'}
          </div>
          <button className="mt-2 px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white text-sm rounded-lg transition">
            {lang === 'hi' ? 'PSF एक्शन लें' : 'Trigger PSF Action'}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <div className="text-2xl mb-1">{k.icon}</div>
            <div className="text-xs text-gray-400">{k.label[lang]}</div>
            <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Price Forecast Area Chart */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
        <h2 className="font-bold text-purple-200 mb-1">{t('priceForecast')}</h2>
        <p className="text-xs text-gray-400 mb-4">
          {lang === 'hi' ? 'TFT मॉडल से P10/P50/P90 बैंड — नागपुर संतरा' : 'TFT model P10/P50/P90 bands — Nagpur Orange (₹/kg)'}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={forecast} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="p90g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="p50g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="₹" />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#d1d5db' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [`₹${Number(v).toFixed(1)}/kg`]}
            />
            <Area type="monotone" dataKey="p90" name="P90 (High)" stroke="#7c3aed" fill="url(#p90g)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="p50" name="P50 (Expected)" stroke="#06b6d4" fill="url(#p50g)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="p10" name="P10 (Low)" stroke="#10b981" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex gap-6 mt-2 text-xs">
          {[
            { color: '#7c3aed', label: t('p90Label') },
            { color: '#06b6d4', label: t('p50Label') },
            { color: '#10b981', label: t('p10Label') },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-1.5 text-gray-400">
              <div className="w-4 h-0.5 rounded" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Corridor arrivals */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
        <h2 className="font-bold text-purple-200 mb-4">{t('arrivals')}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={arrivals} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#d1d5db' }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Bar dataKey="nagpur" name="Nagpur" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            <Bar dataKey="wardha" name="Wardha" fill="#06b6d4" radius={[3, 3, 0, 0]} />
            <Bar dataKey="amravati" name="Amravati" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Corridor stats table */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
        <h2 className="font-bold text-purple-200 mb-4">{t('corridorStats')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="pb-2 text-left">{lang === 'hi' ? 'कॉरिडोर' : 'Corridor'}</th>
                <th className="pb-2 text-left">{t('activeFarmers')}</th>
                <th className="pb-2 text-left">{t('totalVolume')}</th>
                <th className="pb-2 text-left">{t('avgFarmerShare')}</th>
                <th className="pb-2 text-left">{t('spoilageRate')}</th>
                <th className="pb-2 text-left">{lang === 'hi' ? 'चेतावनी' : 'Alert'}</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Nagpur → Mumbai',
                  farmers: 312, volume: '48.6t', share: '71%', spoilage: '14.2%',
                  alert: { en: '⚠️ Shortage risk', hi: '⚠️ कमी का खतरा' },
                },
                {
                  name: 'Wardha → Pune',
                  farmers: 128, volume: '22.1t', share: '68%', spoilage: '16.8%',
                  alert: { en: '✅ Normal', hi: '✅ सामान्य' },
                },
                {
                  name: 'Amravati → Nashik',
                  farmers: 89, volume: '18.4t', share: '65%', spoilage: '19.1%',
                  alert: { en: '⚠️ High spoilage', hi: '⚠️ ज्यादा बर्बादी' },
                },
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800 transition">
                  <td className="py-3 font-medium text-gray-200">{row.name}</td>
                  <td className="py-3 text-gray-300">{row.farmers}</td>
                  <td className="py-3 text-gray-300">{row.volume}</td>
                  <td className="py-3 text-green-400 font-semibold">{row.share}</td>
                  <td className="py-3 text-yellow-400">{row.spoilage}</td>
                  <td className="py-3 text-sm">{row.alert[lang]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live PACS Lots & Agmarknet Quality Audit */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <div>
              <h2 className="font-bold text-purple-200">
                {lang === 'hi' ? 'PACS हब वास्तविक समय खरीद और गुणवत्ता निगरानी' : 'Live PACS Hub Procurement & Agmarknet Quality Log'}
              </h2>
              <p className="text-xs text-gray-400">
                {lang === 'hi'
                  ? 'FSSAI / APEDA / Agmarknet अनुपालन — सीधे PACS वेईब्रिज व YOLOv8 AI से जुड़े'
                  : 'FSSAI / APEDA / Agmarknet Compliance — Streamed from PACS Weighbridges & Vision AI'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-purple-300 bg-purple-950/80 border border-purple-800 px-3 py-1 rounded-full">
            {lots.length} {lang === 'hi' ? 'लॉट ट्रैक किए गए' : 'Lots Tracked'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700 uppercase tracking-wider">
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'लॉट ID' : 'Lot ID'}</th>
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'किसान' : 'Farmer'}</th>
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'फसल व वजन' : 'Crop & Weight'}</th>
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'Agmarknet ग्रेड' : 'Grade'}</th>
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'गुणवत्ता स्कोर' : 'Score'}</th>
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'स्थिति' : 'Status'}</th>
                <th className="pb-2.5 text-left">{lang === 'hi' ? 'SHA-256 प्रमाण-पत्र' : 'Certificate'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-gray-800/60 transition">
                  <td className="py-3 font-mono text-gray-300">{lot.id}</td>
                  <td className="py-3 font-medium text-gray-200">
                    {lang === 'hi' ? lot.farmerNameHi : lot.farmerName}
                  </td>
                  <td className="py-3 text-gray-300">
                    🍊 {lot.crop} · {lot.weightKg} kg
                  </td>
                  <td className="py-3">
                    {lot.status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950 text-orange-400 border border-orange-800">
                        {lang === 'hi' ? 'जाँच बाकी' : 'Pending'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lot.grade === 'A' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        lot.grade === 'B' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
                        'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        Grade {lot.grade}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-gray-300">
                    {lot.score ? `${lot.score}/100` : '—'}
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-gray-800 text-gray-300">
                      {lot.status}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-gray-400">
                    {lot.certHash ? (
                      <span className="text-emerald-400">🔐 {lot.certHash.slice(0, 16)}…</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
