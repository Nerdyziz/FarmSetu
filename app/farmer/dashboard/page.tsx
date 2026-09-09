'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/i18n/LanguageContext'
import { MOCK_SHIPMENTS } from '@/lib/mock-data'
import { fetchLots, fetchHarvestSlots, LotRecord, HarvestSlotRecord } from '@/lib/supabase/services'
import { calcShelfLife } from '@/lib/arrhenius'
import Link from 'next/link'

const DEMO_FARMER_ID = 'f1'
const DEMO_FARMER_NAME = { en: 'Ramesh Patil', hi: 'रमेश पाटिल' }

export default function FarmerDashboard() {
  const { t, lang } = useLang()

  const [lots, setLots] = useState<LotRecord[]>([])
  const [slot, setSlot] = useState<HarvestSlotRecord | null>(null)

  useEffect(() => {
    async function loadFarmerData() {
      const [lotsRes, slotRes] = await Promise.all([
        fetchLots(),
        fetchHarvestSlots(DEMO_FARMER_ID),
      ])
      setLots(lotsRes.lots)
      setSlot(slotRes.slot)
    }
    loadFarmerData()
  }, [])

  const myLots = lots.filter((l) => l.farmerId === DEMO_FARMER_ID || l.farmerName === 'Ramesh Patil')
  const myShipment = MOCK_SHIPMENTS.find((s) => s.lotId === myLots[0]?.id)
  const mySlot = slot

  // Calculate shelf life for active shipment
  const shelfInfo = myShipment
    ? calcShelfLife(myShipment.telemetry, myShipment.initialShelfLifeHours)
    : null

  const totalEarned = myLots.reduce((sum, l) => sum + (l.paid70 ?? 0), 0)
  const pending = myLots.reduce(
    (sum, l) =>
      sum + (l.escrowState === 'FULLY_RELEASED' ? 0 : l.totalValue - (l.paid70 ?? 0)),
    0
  )

  const escrowStateLabels: Record<string, { en: string; hi: string }> = {
    PENDING: { en: '⏳ Pending', hi: '⏳ बाकी है' },
    LOCKED: { en: '🔒 Secured', hi: '🔒 सुरक्षित' },
    PARTIAL_RELEASED: { en: '✅ 70% Paid', hi: '✅ 70% मिला' },
    FULLY_RELEASED: { en: '🎉 Fully Paid', hi: '🎉 पूरा मिला' },
  }

  const shipmentStatusLabel =
    shelfInfo?.status === 'safe'
      ? { en: '🟢 On the way — Safe', hi: '🟢 रास्ते में — सुरक्षित' }
      : shelfInfo?.status === 'at-risk'
      ? { en: '🟡 At Risk', hi: '🟡 खतरे में' }
      : { en: '🔴 Diverted', hi: '🔴 मोड़ा गया' }

  return (
    <div className="px-4 pt-5 space-y-5 max-w-lg mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-orange-400 to-green-500 text-white rounded-2xl p-5 shadow">
        <div className="text-2xl font-bold">{lang === 'hi' ? 'नमस्ते 🙏' : 'Welcome 🙏'}</div>
        <div className="text-lg font-semibold mt-1">{DEMO_FARMER_NAME[lang]}</div>
        <div className="text-sm opacity-80 mt-0.5">
          {lang === 'hi' ? 'नागपुर, महाराष्ट्र' : 'Nagpur, Maharashtra'}
        </div>
      </div>

      {/* Money cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-xs text-gray-500">{t('totalEarned')}</div>
          <div className="text-2xl font-bold text-green-700">₹{totalEarned.toLocaleString('hi-IN')}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
          <div className="text-2xl mb-1">⏳</div>
          <div className="text-xs text-gray-500">{t('pending')}</div>
          <div className="text-2xl font-bold text-orange-600">₹{pending.toLocaleString('hi-IN')}</div>
        </div>
      </div>

      {/* Harvest slot */}
      {mySlot && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📅</span>
            <span className="font-bold text-gray-800 text-base">{t('harvestDay')}</span>
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${
            mySlot.advice === 'now'
              ? 'bg-green-100 text-green-700'
              : mySlot.advice === 'soon'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {mySlot.advice === 'now'
              ? t('harvestNow')
              : mySlot.advice === 'soon'
              ? t('harvestSoon')
              : t('harvestWait')}
          </div>
          <div className="text-sm text-gray-600">
            {lang === 'hi' ? 'अनुमानित भाव:' : 'Expected price:'}{' '}
            <span className="font-bold text-green-700">₹{mySlot.priceExpected}/kg</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {lang === 'hi' ? 'तारीख:' : 'Date:'} {mySlot.advisedDate}
          </div>
        </div>
      )}

      {/* My lots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800 text-lg">{t('myLots')}</h2>
          <Link
            href="/farmer/new-lot"
            className="text-sm text-orange-600 font-semibold bg-orange-50 px-3 py-1 rounded-full"
          >
            + {lang === 'hi' ? 'नया' : 'Add'}
          </Link>
        </div>
        {myLots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">🌾</div>
            <div>{t('noLotsYet')}</div>
            <Link href="/farmer/new-lot" className="text-orange-600 font-semibold text-sm">
              {t('addFirstLot')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myLots.map((lot) => (
              <div key={lot.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-800">🍊 {lot.crop}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {lang === 'hi' ? 'लॉट:' : 'Lot:'} {lot.id} · {lot.weightKg} kg
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold grade-${lot.grade.toLowerCase()}`}>
                    {lang === 'hi'
                      ? `श्रेणी ${lot.grade}`
                      : `Grade ${lot.grade}`}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {escrowStateLabels[lot.escrowState]?.[lang] ?? lot.escrowState}
                  </span>
                  <span className="text-xs text-gray-400">
                    ₹{lot.totalValue.toLocaleString('hi-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipment status */}
      {myShipment && shelfInfo && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚚</span>
            <span className="font-bold text-gray-800">{t('myShipment')}</span>
          </div>
          <div className="text-sm text-gray-600 mb-3">
            {myShipment.origin} → {myShipment.destination}
          </div>
          {/* Simple shelf life bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{lang === 'hi' ? 'ताजगी बाकी' : 'Freshness remaining'}</span>
              <span>{Math.round(shelfInfo.fractionRemaining * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  shelfInfo.status === 'safe'
                    ? 'bg-green-500'
                    : shelfInfo.status === 'at-risk'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(2, shelfInfo.fractionRemaining * 100)}%` }}
              />
            </div>
          </div>
          <div className="text-sm font-semibold">{shipmentStatusLabel[lang]}</div>
        </div>
      )}

      <div className="pb-4" />
    </div>
  )
}
