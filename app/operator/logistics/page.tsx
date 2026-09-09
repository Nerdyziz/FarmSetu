'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLang } from '@/lib/i18n/LanguageContext'
import { MOCK_SHIPMENTS } from '@/lib/mock-data'
import { calcShelfLife } from '@/lib/arrhenius'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  fetchStandingBids,
  createDiversionOrder,
  StandingBidRecord,
} from '@/lib/supabase/services'

export default function OperatorLogisticsPage() {
  const { lang } = useLang()
  const [selectedShipment, setSelectedShipment] = useState(MOCK_SHIPMENTS[0])
  const [processorBids, setProcessorBids] = useState<StandingBidRecord[]>([])
  const [divertedMsg, setDivertedMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadBids() {
      const res = await fetchStandingBids()
      setProcessorBids(res.bids)
    }
    loadBids()
  }, [])

  const shelfInfo = calcShelfLife(selectedShipment.telemetry, selectedShipment.initialShelfLifeHours)

  // Prepare temperature history for chart (last 24 readings = 6 hours)
  const tempChartData = selectedShipment.telemetry.slice(-24).map((r, i) => ({
    time: `${Math.floor(i * 15 / 60)}h${(i * 15) % 60 === 0 ? '' : (i * 15) % 60 + 'm'}`,
    temp: r.tempC,
  }))

  const statusColor = shelfInfo.status === 'safe'
    ? 'text-green-700 bg-green-50 border-green-300'
    : shelfInfo.status === 'at-risk'
    ? 'text-yellow-700 bg-yellow-50 border-yellow-300'
    : 'text-red-700 bg-red-50 border-red-300'

  const statusLabel = {
    safe: { en: '🟢 Safe — Continue Route', hi: '🟢 सुरक्षित' },
    'at-risk': { en: '🟡 At Risk — Monitor Closely', hi: '🟡 खतरे में' },
    diverted: { en: '🔴 Diverted to Processor', hi: '🔴 मोड़ा गया' },
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          {lang === 'hi' ? '🚚 लॉजिस्टिक्स डैशबोर्ड' : '🚚 Logistics Dashboard'}
        </h1>
        <Link
          href="/operator/truck-booking"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 w-fit"
        >
          <span>🚛</span>
          <span>{lang === 'hi' ? '+ नया ट्रक लोड बुक करें' : '+ Book Consolidated Truck'}</span>
        </Link>
      </div>

      {/* Shipment selector */}
      <div className="flex gap-3 flex-wrap">
        {MOCK_SHIPMENTS.map((s) => {
          const sInfo = calcShelfLife(s.telemetry, s.initialShelfLifeHours)
          return (
            <button
              key={s.id}
              onClick={() => setSelectedShipment(s)}
              className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition ${
                selectedShipment.id === s.id
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
              }`}
            >
              {s.id} ({sInfo.status === 'safe' ? '🟢' : sInfo.status === 'at-risk' ? '🟡' : '🔴'})
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Arrhenius Gauge */}
        <div className={`rounded-2xl p-5 border-2 ${statusColor} shadow-sm`}>
          <h2 className="font-bold mb-3">
            {lang === 'hi' ? '🧪 Arrhenius ताजगी गेज' : '🧪 Arrhenius Shelf-Life Gauge'}
          </h2>
          {/* Circular-style gauge using SVG */}
          <div className="flex flex-col items-center my-4">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="56" fill="none" stroke="#e5e7eb" strokeWidth="14" />
              <circle
                cx="70"
                cy="70"
                r="56"
                fill="none"
                stroke={shelfInfo.status === 'safe' ? '#16a34a' : shelfInfo.status === 'at-risk' ? '#ca8a04' : '#dc2626'}
                strokeWidth="14"
                strokeDasharray={`${Math.round(shelfInfo.fractionRemaining * 352)} 352`}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
              />
              <text x="70" y="65" textAnchor="middle" className="font-bold" fontSize="22" fill="#1f2937" fontWeight="bold">
                {Math.round(shelfInfo.fractionRemaining * 100)}%
              </text>
              <text x="70" y="85" textAnchor="middle" fontSize="11" fill="#6b7280">
                {lang === 'hi' ? 'ताजगी बाकी' : 'Remaining'}
              </text>
            </svg>
          </div>
          <div className="text-center">
            <div className="font-bold text-sm">{statusLabel[shelfInfo.status][lang]}</div>
            <div className="text-xs mt-1 opacity-70">
              {lang === 'hi' ? 'बचे घंटे:' : 'Hours left:'} {Math.round(shelfInfo.hoursRemaining)}h
            </div>
          </div>
        </div>

        {/* Shipment details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 md:col-span-2">
          <h2 className="font-bold text-gray-700 mb-3">
            {lang === 'hi' ? 'शिपमेंट विवरण' : 'Shipment Details'}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: lang === 'hi' ? 'शिपमेंट ID' : 'Shipment ID', value: selectedShipment.id },
              { label: lang === 'hi' ? 'लॉट ID' : 'Lot ID', value: selectedShipment.lotId },
              { label: lang === 'hi' ? 'ट्रक नंबर' : 'Truck', value: selectedShipment.truckId },
              { label: lang === 'hi' ? 'चालक' : 'Driver', value: selectedShipment.driverName },
              { label: lang === 'hi' ? 'से' : 'Origin', value: selectedShipment.origin },
              { label: lang === 'hi' ? 'जाना है' : 'Destination', value: selectedShipment.destination },
              {
                label: lang === 'hi' ? 'स्थिति' : 'Status',
                value: selectedShipment.status === 'diverted'
                  ? (lang === 'hi' ? '🔴 मोड़ा गया' : '🔴 Diverted')
                  : (lang === 'hi' ? '🟢 रास्ते में' : '🟢 En Route'),
              },
              {
                label: lang === 'hi' ? 'अभी तापमान' : 'Current Temp',
                value: `${selectedShipment.telemetry[selectedShipment.telemetry.length - 1].tempC}°C`,
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-2">
                <div className="text-xs text-gray-400">{item.label}</div>
                <div className="font-semibold text-gray-800 text-sm">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Temperature history chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-700 mb-4">
          {lang === 'hi' ? '🌡️ तापमान इतिहास (BLE टेलीमेट्री)' : '🌡️ Temperature History (BLE Telemetry)'}
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={tempChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 30]} tick={{ fontSize: 10 }} unit="°C" />
            <Tooltip formatter={(v) => [`${v}°C`, lang === 'hi' ? 'तापमान' : 'Temperature']} />
            {/* Cold-chain safe zone */}
            <Line
              type="monotone"
              dataKey="temp"
              stroke={shelfInfo.status === 'safe' ? '#3b82f6' : '#f59e0b'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-green-500 rounded" />
            {lang === 'hi' ? 'सुरक्षित क्षेत्र (≤ 8°C)' : 'Safe Zone (≤ 8°C)'}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-red-400 rounded" />
            {lang === 'hi' ? 'खतरनाक क्षेत्र' : 'Danger Zone'}
          </div>
        </div>
      </div>

      {/* Diversion panel */}
      {shelfInfo.status !== 'safe' && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
          <h2 className="font-bold text-red-800 text-lg mb-3">
            {lang === 'hi' ? '🚨 Diversion Engine सक्रिय' : '🚨 Diversion Engine Active'}
          </h2>
          <p className="text-red-700 text-sm mb-4">
            {lang === 'hi'
              ? `ताजगी ${Math.round(shelfInfo.fractionRemaining * 100)}% — माल को प्रोसेसर की ओर मोड़ने की सिफारिश है`
              : `Shelf life at ${Math.round(shelfInfo.fractionRemaining * 100)}% — recommend diverting to processor`}
          </p>
          <div className="bg-white rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between font-bold text-gray-700 mb-2">
              <span>{lang === 'hi' ? 'उपलब्ध प्रोसेसर बोलियाँ (Supabase):' : 'Standing Processor Bids (Supabase):'}</span>
              <Link
                href="/operator/processor-bids"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {lang === 'hi' ? 'सभी बोलियाँ देखें →' : 'View All Bids →'}
              </Link>
            </div>

            {divertedMsg && (
              <div className="p-2.5 mb-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold">
                ✅ {divertedMsg}
              </div>
            )}

            {(processorBids.length > 0 ? processorBids.slice(0, 3) : [
              { id: '1', processorName: 'Nagpur Juice Plant', pricePerKg: 15, maxDistanceKm: 42, plantLocation: 'MIDC Hingna' },
              { id: '2', processorName: 'Vidarbha Processing Co.', pricePerKg: 13.5, maxDistanceKm: 67, plantLocation: 'MIDC Wardha' },
            ]).map((b: any, i) => (
              <div key={b.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="font-semibold text-gray-800">{b.processorName}</div>
                  <div className="text-xs text-gray-500">📍 {b.plantLocation || `${b.maxDistanceKm} km radius`}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-700">₹{b.pricePerKg}/kg</div>
                  <button
                    onClick={async () => {
                      await createDiversionOrder({
                        shipmentId: selectedShipment.id,
                        lotId: selectedShipment.lotId,
                        shelfLifePct: Math.round(shelfInfo.fractionRemaining * 100),
                        reason: 'Arrhenius thermal kinetic excursion — diverted to processor',
                        processorName: b.processorName,
                        processorBidPerKg: b.pricePerKg,
                        salvageValue: b.pricePerKg * 800,
                      })
                      setDivertedMsg(`Shipment ${selectedShipment.id} diverted to ${b.processorName}! Saved to Supabase diversion_orders.`)
                      setTimeout(() => setDivertedMsg(null), 5000)
                    }}
                    className="text-xs bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition mt-1 font-semibold"
                  >
                    {lang === 'hi' ? 'अभी मोड़ें' : 'Divert Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
