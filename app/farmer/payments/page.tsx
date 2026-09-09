'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { fetchLots, LotRecord } from '@/lib/supabase/services'

const DEMO_FARMER_ID = 'f1'

const ESCROW_STEPS = [
  { key: 'step1', stateFrom: 'PENDING', icon: '1️⃣', stateNeeded: ['LOCKED', 'PARTIAL_RELEASED', 'FULLY_RELEASED'] },
  { key: 'step2', stateFrom: 'LOCKED', icon: '2️⃣', stateNeeded: ['PARTIAL_RELEASED', 'FULLY_RELEASED'] },
  { key: 'step3', stateFrom: 'PARTIAL_RELEASED', icon: '3️⃣', stateNeeded: ['FULLY_RELEASED'] },
  { key: 'step4', stateFrom: 'FULLY_RELEASED', icon: '4️⃣', stateNeeded: ['FULLY_RELEASED'] },
]

const STEP_LABELS = {
  step1: { en: 'Lot Accepted at PACS', hi: 'PACS में माल मिला ✅' },
  step2: { en: '70% Released to Farmer', hi: '70% पैसा किसान को ✅' },
  step3: { en: 'Buyer Confirmed Delivery', hi: 'खरीदार ने माल माना ✅' },
  step4: { en: 'Remaining 30% Released', hi: 'बाकी 30% पैसा मिला 🎉' },
}

export default function PaymentsPage() {
  const { t, lang } = useLang()
  const [lots, setLots] = useState<LotRecord[]>([])

  useEffect(() => {
    async function loadLots() {
      const res = await fetchLots()
      setLots(res.lots)
    }
    loadLots()

    const handleSimulationSync = () => {
      loadLots()
    }
    window.addEventListener('farmsetu_simulation_update', handleSimulationSync)
    window.addEventListener('storage', handleSimulationSync)
    return () => {
      window.removeEventListener('farmsetu_simulation_update', handleSimulationSync)
      window.removeEventListener('storage', handleSimulationSync)
    }
  }, [])

  const myLots = lots.filter((l) => l.farmerId === DEMO_FARMER_ID || l.farmerName === 'Ramesh Patil')

  const totalEarned = myLots.reduce(
    (s, l) => s + (l.escrowState === 'FULLY_RELEASED' ? l.totalValue : (l.paid70 || 0)),
    0
  )
  const totalPending = myLots.reduce(
    (s, l) => s + (l.escrowState === 'FULLY_RELEASED' ? 0 : Math.max(0, l.totalValue - (l.paid70 || 0))),
    0
  )

  return (
    <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800">
        {lang === 'hi' ? '💰 मेरा पैसा' : '💰 My Payments'}
      </h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs text-green-700 font-semibold">{lang === 'hi' ? 'मिला पैसा' : 'Received'}</div>
            <div className="text-2xl font-bold text-green-700 mt-1">₹{totalEarned.toLocaleString('hi-IN')}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-green-100 text-[11px] font-semibold text-green-800">
            {myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
              ? (lang === 'hi' ? '🎉 100% पूरा मिला' : '🎉 100% Fully Settled')
              : (lang === 'hi' ? '✅ 70% अग्रिम प्राप्त' : '✅ 70% Advance Paid')}
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs text-orange-700 font-semibold">{lang === 'hi' ? 'बाकी है' : 'Pending'}</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">₹{totalPending.toLocaleString('hi-IN')}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-orange-100 text-[11px] font-semibold text-orange-700">
            {myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
              ? (lang === 'hi' ? '✓ कोई बकाया नहीं' : '✓ Zero Pending (Nil)')
              : (lang === 'hi' ? '🔒 30% एस्क्रो में सुरक्षित' : '🔒 30% in Transit Escrow')}
          </div>
        </div>
      </div>

      {/* Explanation box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="font-bold text-blue-800 mb-2">
          {lang === 'hi' ? 'ℹ️ पैसा कैसे मिलता है?' : 'ℹ️ How does payment work?'}
        </div>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            {lang === 'hi'
              ? '• आपका माल PACS में पहुँचते ही — 70% पैसा आपको 24 घंटे में मिलता है'
              : '• As soon as lot is at PACS — 70% within 24 hours'}
          </li>
          <li>
            {lang === 'hi'
              ? '• बाकी 30% — जब खरीदार माल को मंजूरी दे देता है'
              : '• Remaining 30% — after buyer confirms delivery'}
          </li>
          <li>
            {lang === 'hi'
              ? '• पैसा पूरी तरह सुरक्षित (Escrow में) रहता है'
              : '• Money is fully secured in escrow'}
          </li>
        </ul>
      </div>

      {/* Per-lot payment tracker */}
      {myLots.map((lot) => {
        const stepsDone: Record<string, boolean> = {
          step1: ['LOCKED', 'PARTIAL_RELEASED', 'FULLY_RELEASED'].includes(lot.escrowState),
          step2: ['PARTIAL_RELEASED', 'FULLY_RELEASED'].includes(lot.escrowState),
          step3: lot.escrowState === 'FULLY_RELEASED',
          step4: lot.escrowState === 'FULLY_RELEASED',
        }

        return (
          <div key={lot.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-gray-800">🍊 {lot.crop} — {lot.id}</div>
                <div className="text-xs text-gray-500">{lot.weightKg} kg · ₹{(lot.totalValue || 0).toLocaleString('hi-IN')}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  lot.status === 'pending'
                    ? 'bg-orange-100 text-orange-700 border border-orange-300'
                    : `grade-${(lot.grade || 'b').toLowerCase()}`
                }`}>
                  {lot.status === 'pending'
                    ? (lang === 'hi' ? '⏳ जाँच बाकी' : '⏳ Awaiting Grade')
                    : (lang === 'hi' ? `श्रेणी ${lot.grade}` : `Grade ${lot.grade}`)}
                </div>
                {lot.certHash && (
                  <Link
                    href={`/operator/certificate/${lot.id}`}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold rounded-lg transition"
                  >
                    🔐 {lang === 'hi' ? 'प्रमाण-पत्र' : 'Certificate'}
                  </Link>
                )}
              </div>
            </div>

            {/* Step tracker */}
            <div className="space-y-2">
              {ESCROW_STEPS.map((step) => {
                const done = stepsDone[step.key]
                const label = STEP_LABELS[step.key as keyof typeof STEP_LABELS]
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      done ? 'step-done' : 'step-pending'
                    }`}
                  >
                    <span className="text-xl">{done ? '✅' : '⭕'}</span>
                    <span className={`text-sm font-semibold ${done ? 'text-green-800' : 'text-gray-400'}`}>
                      {label[lang]}
                    </span>
                    {step.key === 'step2' && done && (
                      <span className="ml-auto text-sm font-bold text-green-700">
                        ₹{lot.paid70.toLocaleString('hi-IN')}
                      </span>
                    )}
                    {step.key === 'step4' && done && (
                      <span className="ml-auto text-sm font-bold text-green-700">
                        ₹{(lot.totalValue - lot.paid70).toLocaleString('hi-IN')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="pb-8" />
    </div>
  )
}
