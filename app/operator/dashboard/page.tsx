'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { useLang } from '@/lib/i18n/LanguageContext'
import { CORRIDOR_STATS, generateArrivalData } from '@/lib/mock-data'
import { fetchLots, fetchShipments, LotRecord, ShipmentRecord } from '@/lib/supabase/services'

const COLORS = ['#16a34a', '#ca8a04', '#dc2626']

export default function OperatorDashboard() {
  const { t, lang } = useLang()
  const [lots, setLots] = useState<LotRecord[]>([])
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const arrivalData = generateArrivalData()

  useEffect(() => {
    async function loadData() {
      const [lotsRes, shipRes] = await Promise.all([fetchLots(), fetchShipments()])
      setLots(lotsRes.lots)
      setShipments(shipRes.shipments)
    }
    loadData()

    const handleSimulationSync = () => {
      loadData()
    }
    window.addEventListener('farmsetu_simulation_update', handleSimulationSync)
    window.addEventListener('storage', handleSimulationSync)
    return () => {
      window.removeEventListener('farmsetu_simulation_update', handleSimulationSync)
      window.removeEventListener('storage', handleSimulationSync)
    }
  }, [])

  const gradeCount = {
    A: lots.filter((l) => l.grade === 'A').length,
    B: lots.filter((l) => l.grade === 'B').length,
    C: lots.filter((l) => l.grade === 'C').length,
  }

  const dynamicGradeSummary = [
    { name: 'Grade A', value: gradeCount.A || 1, fill: '#16a34a' },
    { name: 'Grade B', value: gradeCount.B || 1, fill: '#ca8a04' },
    { name: 'Grade C', value: gradeCount.C || 1, fill: '#dc2626' },
  ]

  const kpis = [
    {
      label: { en: 'Total Lots Managed', hi: 'कुल प्रबंधित लॉट' },
      value: lots.length,
      icon: '📦',
      color: 'bg-blue-50 border-blue-200 text-blue-700',
    },
    {
      label: { en: 'Active Farmers', hi: 'सक्रिय किसान' },
      value: CORRIDOR_STATS.activeFarmers,
      icon: '🧑‍🌾',
      color: 'bg-green-50 border-green-200 text-green-700',
    },
    {
      label: { en: 'Total Volume (tons)', hi: 'कुल माल (टन)' },
      value: (lots.reduce((acc, l) => acc + l.weightKg, 0) / 1000).toFixed(1),
      icon: '⚖️',
      color: 'bg-purple-50 border-purple-200 text-purple-700',
    },
    {
      label: { en: 'Escrow Settled (₹)', hi: 'एस्क्रो भुगतान (₹)' },
      value: `₹${(lots.reduce((acc, l) => acc + (l.paid70 || 0), 0) / 1000).toFixed(0)}K`,
      icon: '💰',
      color: 'bg-orange-50 border-orange-200 text-orange-700',
    },
    {
      label: { en: 'Spoilage Rate', hi: 'बर्बादी दर' },
      value: `${CORRIDOR_STATS.spoilageRatePct}%`,
      icon: '📉',
      color: 'bg-red-50 border-red-200 text-red-700',
    },
    {
      label: { en: 'Avg Farmer Share', hi: 'किसान का हिस्सा' },
      value: `${CORRIDOR_STATS.avgFarmerSharePct}%`,
      icon: '🏆',
      color: 'bg-teal-50 border-teal-200 text-teal-700',
    },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{t('operatorDashboard')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/operator/truck-booking"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>🚛</span>
            <span>{lang === 'hi' ? 'ट्रक बुक करें' : 'Book Truck'}</span>
          </Link>

          <Link
            href="/operator/processor-bids"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>🏭</span>
            <span>{lang === 'hi' ? 'प्रोसेसर बोलियाँ' : 'Processor Bids'}</span>
          </Link>

          <span className="text-xs text-gray-400 ml-1">
            {lang === 'hi' ? 'नागपुर → मुंबई कॉरिडोर' : 'Nagpur → Mumbai Corridor'}
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${kpi.color}`}>
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-xs font-medium opacity-70">{kpi.label[lang]}</div>
            <div className="text-2xl font-bold mt-1">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Live Fleet Transit & Escrow Settlement Monitor */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚛</span>
            <div>
              <h2 className="font-bold text-gray-800 text-sm">
                {lang === 'hi' ? 'लाइव फ्लीट कॉरिडोर ट्रांजिट व फंड रिलीज' : 'Active Fleet Transit & Escrow Release Monitor'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'hi' ? 'नागपुर → मुंबई समृद्धि महामार्ग कॉरिडोर' : 'Nagpur → Mumbai Samruddhi Expressway Corridor'}
              </p>
            </div>
          </div>
          <Link
            href="/operator/logistics"
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl transition flex items-center gap-1 w-fit"
          >
            <span>📡</span>
            <span>{lang === 'hi' ? 'लाइव सिमुलेटर व रूट ट्रैकर खोलें →' : 'Open Route Simulator & Telemetry →'}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shipments.slice(0, 2).map((s) => {
            const isDelivered = s.status === 'arrived'
            const isDiverted = s.status === 'diverted'
            return (
              <div key={s.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-800">{s.id} · {s.truckId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isDelivered ? 'bg-emerald-100 text-emerald-800' : isDiverted ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mt-1">
                    📍 {s.currentLocation || `${s.origin} → ${s.destination}`}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {s.driverName} · {s.totalWeightKg} kg ({s.totalCrates} crates)
                  </div>

                  {/* Route Progress Bar */}
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span>{lang === 'hi' ? 'समृद्धि कॉरिडोर प्रगति' : 'Corridor Progress'}</span>
                      <span className="font-mono font-bold text-gray-700">{s.progressPct ?? (isDelivered ? 100 : 45)}%</span>
                    </div>
                    <div className="w-full bg-gray-200/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDelivered
                            ? 'bg-emerald-500'
                            : isDiverted
                            ? 'bg-rose-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.max(4, s.progressPct ?? (isDelivered ? 100 : 45))}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200/70 flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">
                    {lang === 'hi' ? 'फंड स्थिति:' : 'Escrow Rail:'}
                  </span>
                  <span className={`font-bold ${isDelivered ? 'text-emerald-700' : isDiverted ? 'text-amber-700' : 'text-blue-700'}`}>
                    {isDelivered
                      ? (lang === 'hi' ? '🎉 100% पूरा फंड रिलीज' : '🎉 100% Fully Settled')
                      : isDiverted
                      ? (lang === 'hi' ? '🛡️ 70% अग्रिम गारंटी सुरक्षित' : '🛡️ 70% Protected (Diverted)')
                      : (lang === 'hi' ? '✅ 70% अग्रिम जारी · 30% बाकी' : '✅ 70% Advance · 30% Geofence')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Grade distribution pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4">{t('gradeDistribution')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={dynamicGradeSummary}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {dynamicGradeSummary.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {dynamicGradeSummary.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-gray-600">{g.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrivals bar chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-700 mb-4">
            {lang === 'hi' ? '14 दिन का आगमन (टन)' : '14-Day Arrivals (tons)'}
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={arrivalData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="nagpur" name="Nagpur" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wardha" name="Wardha" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="amravati" name="Amravati" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lot table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-700">{t('lotManagement')}</h2>
          <span className="text-sm text-gray-400">{lots.length} lots</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'लॉट ID' : 'Lot ID'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'किसान' : 'Farmer'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'फसल' : 'Crop'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'वजन' : 'Weight'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'श्रेणी' : 'Grade'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'अंक' : 'Score'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'एस्क्रो' : 'Escrow'}</th>
                <th className="px-4 py-3 text-left">{lang === 'hi' ? 'प्रमाण-पत्र' : 'Cert'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{lot.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {lang === 'hi' ? lot.farmerNameHi : lot.farmerName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">🍊 {lot.crop}</td>
                  <td className="px-4 py-3 text-gray-600">{lot.weightKg} kg</td>
                  <td className="px-4 py-3">
                    {lot.status === 'pending' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        {lang === 'hi' ? 'जाँच बाकी' : 'Pending'}
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold grade-${(lot.grade || 'b').toLowerCase()}`}>
                        {lot.grade || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${(lot.score || 0) >= 75 ? 'bg-green-500' : (lot.score || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${lot.score || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{lot.score ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {(lot.escrowState || 'PENDING').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {lot.certHash ? (
                      <Link
                        href={`/operator/certificate/${lot.id}`}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-semibold rounded transition"
                      >
                        🔐 {lang === 'hi' ? 'देखें' : 'View'}
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
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
