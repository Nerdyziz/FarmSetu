'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/i18n/LanguageContext'
import { MOCK_SHIPMENTS } from '@/lib/mock-data'
import {
  fetchLots,
  fetchHarvestSlots,
  fetchShipments,
  LotRecord,
  HarvestSlotRecord,
  ShipmentRecord,
} from '@/lib/supabase/services'
import { calcShelfLife } from '@/lib/arrhenius'
import Link from 'next/link'

const DEMO_FARMER_ID = 'f1'
const DEMO_FARMER_NAME = { en: 'Ramesh Patil', hi: 'रमेश पाटिल' }

export default function FarmerDashboard() {
  const { t, lang } = useLang()

  const [lots, setLots] = useState<LotRecord[]>([])
  const [slot, setSlot] = useState<HarvestSlotRecord | null>(null)
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])

  useEffect(() => {
    async function loadFarmerData() {
      const [lotsRes, slotRes, shipRes] = await Promise.all([
        fetchLots(),
        fetchHarvestSlots(DEMO_FARMER_ID),
        fetchShipments(),
      ])
      setLots(lotsRes.lots)
      setSlot(slotRes.slot)
      setShipments(shipRes.shipments)
    }
    loadFarmerData()

    const handleSimulationSync = () => {
      loadFarmerData()
    }
    window.addEventListener('farmsetu_simulation_update', handleSimulationSync)
    window.addEventListener('storage', handleSimulationSync)
    return () => {
      window.removeEventListener('farmsetu_simulation_update', handleSimulationSync)
      window.removeEventListener('storage', handleSimulationSync)
    }
  }, [])

  const myLots = lots.filter((l) => l.farmerId === DEMO_FARMER_ID || l.farmerName === 'Ramesh Patil')
  const myLotIds = myLots.map((l) => l.id)
  const myShipment = shipments.find((s) => s.lotIds?.some((id) => myLotIds.includes(id))) || shipments[0]
  const mySlot = slot

  // Calculate shelf life for active shipment
  const shelfInfo = myShipment
    ? calcShelfLife(
        myShipment.telemetry && myShipment.telemetry.length > 0
          ? myShipment.telemetry
          : [{ timestamp: Date.now(), tempC: myShipment.currentTempC || 5.8 }],
        myShipment.initialShelfLifeHours || 240
      )
    : null

  const totalEarned = myLots.reduce(
    (sum, l) => sum + (l.escrowState === 'FULLY_RELEASED' ? l.totalValue : (l.paid70 ?? 0)),
    0
  )
  const pending = myLots.reduce(
    (sum, l) =>
      sum + (l.escrowState === 'FULLY_RELEASED' ? 0 : Math.max(0, l.totalValue - (l.paid70 ?? 0))),
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 flex flex-col justify-between">
          <div>
            <div className="text-2xl mb-1">💰</div>
            <div className="text-xs text-gray-500">{t('totalEarned')}</div>
            <div className="text-2xl font-bold text-green-700">₹{totalEarned.toLocaleString('hi-IN')}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-green-50 text-[11px] font-semibold text-green-800">
            {myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
              ? (lang === 'hi' ? '🎉 100% पूरा भुगतान प्राप्त' : '🎉 100% Fully Settled')
              : (lang === 'hi' ? '✅ 70% अग्रिम प्राप्त' : '✅ 70% Advance Paid')}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 flex flex-col justify-between">
          <div>
            <div className="text-2xl mb-1">⏳</div>
            <div className="text-xs text-gray-500">{t('pending')}</div>
            <div className="text-2xl font-bold text-orange-600">₹{pending.toLocaleString('hi-IN')}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-orange-50 text-[11px] font-semibold text-orange-700">
            {myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
              ? (lang === 'hi' ? '✓ शून्य बकाया (सब मिला)' : '✓ Zero Pending (Nil)')
              : (lang === 'hi' ? '🔒 30% एस्क्रो में सुरक्षित' : '🔒 30% in Transit Escrow')}
          </div>
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
                  {lot.status === 'pending' ? (
                    <div className="px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700 border border-orange-300">
                      ⏳ {lang === 'hi' ? 'जाँच बाकी' : 'Awaiting Grade'}
                    </div>
                  ) : (
                    <div className={`px-3 py-1 rounded-full text-sm font-bold grade-${lot.grade.toLowerCase()}`}>
                      {lang === 'hi' ? `श्रेणी ${lot.grade}` : `Grade ${lot.grade}`}
                    </div>
                  )}
                </div>
                {lot.status !== 'pending' && (
                  <>
                    <div className="mt-2 flex gap-3 text-xs text-gray-500">
                      <span>Brix: {lot.brixPct}%</span>
                      <span>•</span>
                      <span>{lang === 'hi' ? 'अंक:' : 'Score:'} {lot.score}/100</span>
                      <span>•</span>
                      <span>₹{lot.pricePerKg}/kg</span>
                    </div>
                    {lot.certHash && (
                      <Link
                        href={`/operator/certificate/${lot.id}`}
                        className="inline-block mt-1.5 text-xs text-emerald-700 font-semibold hover:underline"
                      >
                        🔐 {lang === 'hi' ? 'प्रमाण-पत्र देखें' : 'View Certificate'}
                      </Link>
                    )}
                  </>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {escrowStateLabels[lot.escrowState]?.[lang] ?? lot.escrowState}
                  </span>
                  {lot.totalValue > 0 && (
                    <span className="text-xs text-gray-400">
                      ₹{lot.totalValue.toLocaleString('hi-IN')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shipment status */}
      {myShipment && shelfInfo && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚚</span>
              <div>
                <span className="font-bold text-gray-800 text-base">{t('myShipment')}</span>
                <span className="text-xs text-gray-400 font-mono ml-2">{myShipment.truckId}</span>
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              myShipment.status === 'arrived' || myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : myShipment.status === 'diverted'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : 'bg-blue-100 text-blue-800 border border-blue-300'
            }`}>
              {myShipment.status === 'arrived' || myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
                ? (lang === 'hi' ? '✅ गंतव्य पहुँचा (100% भुगतान)' : '✅ Arrived (100% Settled)')
                : myShipment.status === 'diverted'
                ? (lang === 'hi' ? '🔴 प्रोसेसर को मोड़ा गया' : '🔴 Diverted to Processor')
                : (lang === 'hi' ? '🟢 रास्ते में' : '🟢 En Route')}
            </span>
          </div>

          {/* Current Waypoint */}
          <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100">
            <div className="text-[11px] font-semibold text-blue-800">
              {lang === 'hi' ? '📍 ट्रक अभी कहाँ है:' : '📍 Live Truck Waypoint:'}
            </div>
            <div className="text-sm font-bold text-blue-950 mt-0.5">
              {myShipment.currentLocation || `${myShipment.origin} → ${myShipment.destination}`}
            </div>
            <div className="flex items-center justify-between text-xs text-blue-700 mt-2">
              <span>{lang === 'hi' ? 'चालक:' : 'Driver:'} {myShipment.driverName}</span>
              <span>🌡️ {myShipment.currentTempC || 5.8}°C</span>
            </div>
          </div>

          {/* Corridor Route Transit Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-600">
              <span className="font-semibold">{lang === 'hi' ? 'समृद्धि महामार्ग प्रगति:' : 'Samruddhi Corridor Progress:'}</span>
              <span className="font-bold text-blue-800 font-mono">{myShipment.progressPct ?? 45}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  myShipment.status === 'arrived' || myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
                    ? 'bg-emerald-500'
                    : myShipment.status === 'diverted'
                    ? 'bg-rose-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.max(5, myShipment.progressPct ?? 45)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{myShipment.origin}</span>
              <span>{myShipment.destination}</span>
            </div>
          </div>

          {/* Shelf Life Progress */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{lang === 'hi' ? 'ताजगी बाकी (Arrhenius)' : 'Freshness remaining (Arrhenius)'}</span>
              <span className="font-bold">{Math.round(shelfInfo.fractionRemaining * 100)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  shelfInfo.status === 'safe'
                    ? 'bg-green-500'
                    : shelfInfo.status === 'at-risk'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(4, shelfInfo.fractionRemaining * 100)}%` }}
              />
            </div>
          </div>

          {/* Live Fund Release Status Banner */}
          <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            myShipment.status === 'arrived' || myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : myShipment.status === 'diverted'
              ? 'bg-amber-50 text-amber-900 border border-amber-200'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            <span>💰</span>
            <div>
              {myShipment.status === 'arrived' || myLots.some((l) => l.escrowState === 'FULLY_RELEASED')
                ? (lang === 'hi'
                    ? '100% पूरा भुगतान मिल गया! बाकी 30% आपके बैंक खाते में जमा हो गया है।'
                    : '100% Full Payment Settled! Remaining 30% has reached your bank account.')
                : myShipment.status === 'diverted'
                ? (lang === 'hi'
                    ? '70% अग्रिम PACS गारंटी द्वारा सुरक्षित है। फसल जूस फैक्ट्री की ओर मोड़ी गई।'
                    : '70% Advance Protected by PACS Escrow Guarantee. Rerouted to processing plant.')
                : (lang === 'hi'
                    ? '70% अग्रिम मिला · शेष 30% मंडी में डिलीवरी के बाद सीधे खाते में आएगा।'
                    : '70% Advance Paid · Final 30% releases automatically upon buyer geofence delivery.')}
            </div>
          </div>
        </div>
      )}

      <div className="pb-4" />
    </div>
  )
}
