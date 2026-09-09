'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/i18n/LanguageContext'
import { fetchLots, logEscrowTransition, LotRecord } from '@/lib/supabase/services'

type GradeFilter = 'All' | 'A' | 'B' | 'C'

export default function BrowsePage() {
  const { lang } = useLang()
  const [lots, setLots] = useState<LotRecord[]>([])
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('All')
  const [orderedLots, setOrderedLots] = useState<string[]>([])

  useEffect(() => {
    async function loadLots() {
      const res = await fetchLots()
      setLots(res.lots)
    }
    loadLots()
  }, [])

  const filtered = gradeFilter === 'All'
    ? lots
    : lots.filter((l) => l.grade === gradeFilter)

  const handleOrder = async (lotId: string) => {
    setOrderedLots((prev) => [...prev, lotId])
    const targetLot = lots.find((l) => l.id === lotId)
    if (targetLot) {
      await logEscrowTransition(
        lotId,
        'PENDING',
        'LOCKED',
        targetLot.totalValue,
        'Buyer Marketplace Escrow Lock'
      )
    }
  }

  const gradeColors: Record<string, string> = {
    A: 'bg-green-50 border-green-300',
    B: 'bg-yellow-50 border-yellow-300',
    C: 'bg-red-50 border-red-300',
  }

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {lang === 'hi' ? '🍊 उपलब्ध लॉट' : '🍊 Available Lots'}
        </h1>
        <div className="text-sm text-gray-400">
          {filtered.length} {lang === 'hi' ? 'लॉट मिले' : 'lots found'}
        </div>
      </div>

      {/* Grade filter */}
      <div className="flex gap-2">
        {(['All', 'A', 'B', 'C'] as GradeFilter[]).map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition border ${
              gradeFilter === g
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
            }`}
          >
            {g === 'All' ? (lang === 'hi' ? 'सभी' : 'All') : `Grade ${g}`}
          </button>
        ))}
      </div>

      {/* Lot cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((lot) => {
          const isOrdered = orderedLots.includes(lot.id)
          return (
            <div key={lot.id} className={`border-2 rounded-2xl p-5 bg-white shadow-sm ${gradeColors[lot.grade]}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-gray-800 text-lg">🍊 {lot.crop}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {lang === 'hi' ? 'किसान:' : 'Farmer:'} {lang === 'hi' ? lot.farmerNameHi : lot.farmerName}
                    {' · '}{lot.farmerName.split(' ')[0] === 'Ramesh' ? 'Nagpur' : lot.farmerName.split(' ')[0] === 'Sunita' ? 'Wardha' : 'Amravati'}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold grade-${lot.grade.toLowerCase()}`}>
                  Grade {lot.grade}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: lang === 'hi' ? 'वजन' : 'Weight', value: `${lot.weightKg} kg` },
                  { label: lang === 'hi' ? 'भाव/kg' : 'Price/kg', value: `₹${lot.pricePerKg}` },
                  { label: lang === 'hi' ? 'कुल' : 'Total', value: `₹${lot.totalValue.toLocaleString()}` },
                ].map((item, i) => (
                  <div key={i} className="bg-white/70 rounded-xl p-2 text-center">
                    <div className="text-xs text-gray-400">{item.label}</div>
                    <div className="font-bold text-gray-800 text-sm">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Quality data */}
              <div className="flex gap-3 text-xs text-gray-500 mb-4">
                <span>Brix: {lot.brixPct}%</span>
                <span>•</span>
                <span>{lang === 'hi' ? 'दाग:' : 'Blemish:'} {lot.blemishPct}%</span>
                <span>•</span>
                <span>{lang === 'hi' ? 'अंक:' : 'Score:'} {lot.score}/100</span>
              </div>

              {/* Cert hash */}
              <div className="text-xs text-gray-400 font-mono mb-3">
                🔐 {lot.certHash.slice(0, 24)}…
              </div>

              <button
                onClick={() => handleOrder(lot.id)}
                disabled={isOrdered || lot.status === 'diverted'}
                className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                  isOrdered
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : lot.status === 'diverted'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow'
                }`}
              >
                {isOrdered
                  ? (lang === 'hi' ? '✅ ऑर्डर हो गया' : '✅ Order Placed')
                  : lot.status === 'diverted'
                  ? (lang === 'hi' ? '🔴 मोड़ा गया' : '🔴 Diverted')
                  : (lang === 'hi' ? '🛒 ऑर्डर करें — एस्क्रो में भुगतान' : '🛒 Order — Pay via Escrow')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
