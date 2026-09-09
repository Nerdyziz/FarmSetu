'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import {
  fetchStandingBids,
  addStandingBid,
  fetchLots,
  createDiversionOrder,
  fetchDiversionOrders,
  StandingBidRecord,
  LotRecord,
  DiversionOrderRecord,
} from '@/lib/supabase/services'

export default function ProcessorBidsPage() {
  const { lang } = useLang()

  const [bids, setBids] = useState<StandingBidRecord[]>([])
  const [lots, setLots] = useState<LotRecord[]>([])
  const [diversions, setDiversions] = useState<DiversionOrderRecord[]>([])
  const [isLiveDb, setIsLiveDb] = useState(false)
  const [loading, setLoading] = useState(true)

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'bids' | 'divert' | 'new-bid' | 'history'>('bids')

  // New Bid Form State
  const [newBidForm, setNewBidForm] = useState({
    processorName: '',
    commodity: 'Orange',
    maxDistanceKm: '',
    pricePerKg: '',
    capacityTonsPerDay: '',
    contactPhone: '',
    plantLocation: '',
  })
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [bidSuccessAlert, setBidSuccessAlert] = useState(false)

  // Diversion Match State
  const [selectedLotForDivert, setSelectedLotForDivert] = useState<LotRecord | null>(null)
  const [selectedBidForDivert, setSelectedBidForDivert] = useState<StandingBidRecord | null>(null)
  const [isDiverting, setIsDiverting] = useState(false)
  const [divertSuccessAlert, setDivertSuccessAlert] = useState<string | null>(null)

  // Load data from Supabase / Services on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [bidsRes, lotsRes, divRes] = await Promise.all([
        fetchStandingBids(),
        fetchLots(),
        fetchDiversionOrders(),
      ])

      setBids(bidsRes.bids)
      setLots(lotsRes.lots)
      setDiversions(divRes.orders)
      setIsLiveDb(bidsRes.isLiveDb || lotsRes.isLiveDb)
      setLoading(false)
    }
    loadData()
  }, [])

  // Eligible lots for diversion (Grade C, or already marked diverted, or low score)
  const distressLots = lots.filter(
    (l) => l.grade === 'C' || l.status === 'diverted' || l.score < 50
  )

  const handleRegisterBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBidForm.processorName || !newBidForm.pricePerKg) return

    setIsSubmittingBid(true)
    const res = await addStandingBid({
      processorName: newBidForm.processorName,
      commodity: newBidForm.commodity,
      maxDistanceKm: parseInt(newBidForm.maxDistanceKm) || 50,
      pricePerKg: parseFloat(newBidForm.pricePerKg),
      capacityTonsPerDay: parseFloat(newBidForm.capacityTonsPerDay) || 20,
      contactPhone: newBidForm.contactPhone || '+91 712 000000',
      plantLocation: newBidForm.plantLocation || 'Nagpur Industrial Area',
    })

    // Refresh bids
    const updated = await fetchStandingBids()
    setBids(updated.bids)
    setIsSubmittingBid(false)
    setBidSuccessAlert(true)
    setNewBidForm({
      processorName: '',
      commodity: 'Orange',
      maxDistanceKm: '',
      pricePerKg: '',
      capacityTonsPerDay: '',
      contactPhone: '',
      plantLocation: '',
    })
    setTimeout(() => setBidSuccessAlert(false), 4000)
  }

  const handleExecuteDiversion = async () => {
    if (!selectedLotForDivert || !selectedBidForDivert) return
    setIsDiverting(true)

    const salvageValue = selectedLotForDivert.weightKg * selectedBidForDivert.pricePerKg

    await createDiversionOrder({
      shipmentId: 'SH-DIV-' + selectedLotForDivert.id,
      lotId: selectedLotForDivert.id,
      shelfLifePct: 15.0,
      reason: 'Quality Grade C / Processing Salvage via Standing Liquidity Agreement',
      processorName: selectedBidForDivert.processorName,
      processorBidPerKg: selectedBidForDivert.pricePerKg,
      salvageValue,
    })

    // Refresh data
    const [lotsRes, divRes] = await Promise.all([fetchLots(), fetchDiversionOrders()])
    setLots(lotsRes.lots)
    setDiversions(divRes.orders)
    setIsDiverting(false)
    setDivertSuccessAlert(
      `Lot ${selectedLotForDivert.id} diverted to ${selectedBidForDivert.processorName}! Salvage value: ₹${salvageValue.toLocaleString()}`
    )
    setSelectedLotForDivert(null)
    setSelectedBidForDivert(null)
    setTimeout(() => setDivertSuccessAlert(null), 5000)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
            <span>🏭</span>
            <span>
              {lang === 'hi'
                ? 'प्रोसेसर बोलियाँ और संकटकालीन डायवर्जन (Standing Bids)'
                : 'Standing Processor Bids & Distress Diversion'}
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'hi'
              ? 'PACS हब: खाद्य और जूस कारखानों की पूर्व-प्रतिबद्ध बोलियों से संकटग्रस्त फसल को सड़ने से पहले सुरक्षित मूल्य पर बेचें'
              : 'PACS Hub: Pre-contracted purchase liquidity from food & juice processors absorbs distress lots before total decay'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
              isLiveDb
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveDb ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {isLiveDb
                ? 'Supabase: standing_bids Table Live'
                : 'Local Memory / Demo Store'}
            </span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-4 pt-2 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('bids')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'bids'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📋</span>
          <span>{lang === 'hi' ? 'सक्रिय बोलियाँ' : 'Active Standing Bids'}</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.2 rounded-full text-[10px]">
            {bids.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('divert')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'divert'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>⚡</span>
          <span>{lang === 'hi' ? 'संकटकालीन लॉट मैच व डायवर्ट' : 'Match & Divert Lots'}</span>
          {distressLots.length > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-0.2 rounded-full text-[10px] animate-pulse">
              {distressLots.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('new-bid')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'new-bid'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>➕</span>
          <span>{lang === 'hi' ? 'नई बोली जोड़ें' : 'Register New Bid'}</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📜</span>
          <span>{lang === 'hi' ? 'डायवर्जन इतिहास' : 'Diversion History'}</span>
          <span className="bg-gray-100 text-gray-600 px-2 py-0.2 rounded-full text-[10px]">
            {diversions.length}
          </span>
        </button>
      </div>

      {/* ─── TAB 1: ACTIVE STANDING BIDS ────────────────────────── */}
      {activeTab === 'bids' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-2.5">
            <span className="text-xl">ℹ️</span>
            <div>
              <strong>
                {lang === 'hi'
                  ? 'पूर्व-प्रतिबद्ध तरलता का सिद्धांत (SIH PS ID26033):'
                  : 'Pre-Contracted Distress Liquidity Principle:'}
              </strong>
              <p className="mt-0.5 text-blue-800">
                {lang === 'hi'
                  ? 'ये बोलियाँ स्थानीय जूस और पल्प कंपनियों के साथ स्थायी अनुबंध हैं। जब कोई लॉट खराब होने के जोखिम में होता है या श्रेणी C का होता है, तो वह बिना देरी के इन्हीं बोलियों पर भेजा जाता है — किसान को 100% नुकसान से बचाया जाता है।'
                  : 'These bids are pre-onboarded purchase commitments from juice/squash processors with distance ceilings. Consignments at biological risk divert directly against committed liquidity, avoiding speculative spot-market delays.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bids.map((bid) => (
              <div
                key={bid.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-blue-300 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{bid.processorName}</h3>
                    <div className="text-xs text-gray-500 mt-0.5">📍 {bid.plantLocation}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-700">₹{bid.pricePerKg.toFixed(2)}</div>
                    <div className="text-[10px] text-gray-400">per kg floor bid</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 p-2.5 rounded-xl">
                  <div>
                    <span className="text-gray-400 text-[10px] block">Commodity</span>
                    <span className="font-semibold text-gray-800">🍊 {bid.commodity}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block">Max Radius</span>
                    <span className="font-semibold text-gray-800">≤ {bid.maxDistanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block">Daily Intake</span>
                    <span className="font-semibold text-gray-800">{bid.capacityTonsPerDay} Tons</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                  <span>📞 {bid.contactPhone}</span>
                  <button
                    onClick={() => {
                      setSelectedBidForDivert(bid)
                      setActiveTab('divert')
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition"
                  >
                    {lang === 'hi' ? 'लॉट मैच करें →' : 'Match Lot →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 2: MATCH & DIVERT LOTS ─────────────────────────── */}
      {activeTab === 'divert' && (
        <div className="space-y-5">
          {divertSuccessAlert && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <span>✅</span>
              <span>{divertSuccessAlert}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step 1: Select Candidate Lot */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {lang === 'hi' ? 'संकटग्रस्त / श्रेणी C लॉट चुनें' : 'Select Distress / Grade C Candidate Lot'}
                  </h3>
                </div>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                  {distressLots.length} Candidate Lots
                </span>
              </div>

              {distressLots.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  🎉 No lots currently in distress or Grade C.
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {distressLots.map((lot) => {
                    const isSelected = selectedLotForDivert?.id === lot.id
                    return (
                      <div
                        key={lot.id}
                        onClick={() => setSelectedLotForDivert(lot)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between text-xs ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/60 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-gray-800 flex items-center gap-2">
                            <span>{lang === 'hi' ? lot.farmerNameHi : lot.farmerName}</span>
                            <span className="font-mono text-gray-500 bg-gray-100 px-1 rounded">{lot.id}</span>
                          </div>
                          <div className="text-gray-500 text-[11px] mt-0.5">
                            🍊 {lot.crop} · {lot.weightKg} kg · Status: <span className="text-orange-700 font-semibold">{lot.status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold grade-${lot.grade.toLowerCase()}`}>
                            Grade {lot.grade}
                          </span>
                          <div className="text-gray-400 text-[10px] mt-0.5">Score: {lot.score}/100</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Select Processor Bid */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {lang === 'hi' ? 'प्रोसेसर बोली चुनें' : 'Select Target Processor Bid'}
                  </h3>
                </div>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {bids.length} Active Bids
                </span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {bids.map((b) => {
                  const isSelected = selectedBidForDivert?.id === b.id
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBidForDivert(b)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between text-xs ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-gray-800">{b.processorName}</div>
                        <div className="text-gray-500 text-[11px] mt-0.5">
                          📍 {b.plantLocation} (Radius ≤ {b.maxDistanceKm} km)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700 text-sm">₹{b.pricePerKg.toFixed(2)}/kg</div>
                        <span className="text-[10px] text-gray-400">Intake: {b.capacityTonsPerDay}T/day</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Diversion Match Confirmation Box */}
          {selectedLotForDivert && selectedBidForDivert && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-400 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <h3 className="font-bold text-orange-950 text-base">
                      {lang === 'hi' ? 'डायवर्जन और साल्वेज समझौता' : 'Diversion & Salvage Match Ready'}
                    </h3>
                    <div className="text-xs text-orange-800">
                      Transferring lot <span className="font-mono font-bold">{selectedLotForDivert.id}</span> ({selectedLotForDivert.weightKg} kg) to <strong className="text-gray-900">{selectedBidForDivert.processorName}</strong>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-orange-800">Recovered Salvage Cash</div>
                  <div className="text-2xl font-bold text-emerald-800">
                    ₹{(selectedLotForDivert.weightKg * selectedBidForDivert.pricePerKg).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs bg-white/80 p-3 rounded-xl border border-orange-200">
                <div>
                  <span className="text-gray-500">Farmer Payee:</span>
                  <div className="font-bold text-gray-800">{selectedLotForDivert.farmerName}</div>
                </div>
                <div>
                  <span className="text-gray-500">Intended Plant:</span>
                  <div className="font-bold text-gray-800">{selectedBidForDivert.plantLocation}</div>
                </div>
                <div>
                  <span className="text-gray-500">Settlement Rail:</span>
                  <div className="font-bold text-emerald-700">70% Escrow Advance Protected</div>
                </div>
              </div>

              <button
                onClick={handleExecuteDiversion}
                disabled={isDiverting}
                className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDiverting ? (
                  <span>⏳ Creating Diversion Order in Supabase…</span>
                ) : (
                  <span>⚡ Confirm Diversion & Execute Standing Purchase Order</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: REGISTER NEW PROCESSOR BID ──────────────────── */}
      {activeTab === 'new-bid' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl mx-auto space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-800">
              {lang === 'hi' ? '🏭 नए खाद्य / जूस प्रोसेसर की स्थायी बोली जोड़ें' : 'Register New Standing Processor Bid'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {lang === 'hi'
                ? 'स्थानीय खाद्य प्रसंस्करण इकाई (जूस/पल्प) को FarmSetu नेटवर्क पर पूर्व-प्रतिबद्ध खरीदार के रूप में दर्ज करें'
                : 'Onboard local food processors, juice plants, or pulp units to supply pre-contracted purchase liquidity directly into Supabase'}
            </p>
          </div>

          {bidSuccessAlert && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold">
              ✅ Standing processor bid successfully added to Supabase database!
            </div>
          )}

          <form onSubmit={handleRegisterBid} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Processor / Company Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Nagpur Fresh Juice Processing Ltd."
                value={newBidForm.processorName}
                onChange={(e) => setNewBidForm({ ...newBidForm, processorName: e.target.value })}
                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Commodity *</label>
                <select
                  value={newBidForm.commodity}
                  onChange={(e) => setNewBidForm({ ...newBidForm, commodity: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="Orange">🍊 Orange / Citrus</option>
                  <option value="Tomato">🍅 Tomato (Processing/Paste)</option>
                  <option value="Mango">🥭 Mango (Pulp)</option>
                  <option value="Onion">🧅 Onion (Dehydration)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Offered Floor Price (₹/kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  placeholder="e.g. 15.00"
                  value={newBidForm.pricePerKg}
                  onChange={(e) => setNewBidForm({ ...newBidForm, pricePerKg: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Max Procurement Radius (km)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 60"
                  value={newBidForm.maxDistanceKm}
                  onChange={(e) => setNewBidForm({ ...newBidForm, maxDistanceKm: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Daily Intake Capacity (Tons/day)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={newBidForm.capacityTonsPerDay}
                  onChange={(e) => setNewBidForm({ ...newBidForm, capacityTonsPerDay: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Plant Location</label>
                <input
                  type="text"
                  placeholder="e.g. MIDC Butibori, Nagpur"
                  value={newBidForm.plantLocation}
                  onChange={(e) => setNewBidForm({ ...newBidForm, plantLocation: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 712 289000"
                  value={newBidForm.contactPhone}
                  onChange={(e) => setNewBidForm({ ...newBidForm, contactPhone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingBid}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSubmittingBid ? 'Saving to Supabase Database…' : '➕ Save Standing Bid to Supabase'}
            </button>
          </form>
        </div>
      )}

      {/* ─── TAB 4: DIVERSION HISTORY & RECONCILIATION ──────────── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">
              {lang === 'hi'
                ? 'डायवर्जन और साल्वेज समझौता इतिहास (Supabase diversion_orders)'
                : 'Diversion Orders & Salvage Reconciliation (Supabase Table: diversion_orders)'}
            </h2>
            <span className="text-xs text-gray-400">{diversions.length} Orders Logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Lot ID</th>
                  <th className="px-4 py-3 text-left">Assigned Processor</th>
                  <th className="px-4 py-3 text-left">Trigger Reason</th>
                  <th className="px-4 py-3 text-left">Salvage Value</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {diversions.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{d.id}</td>
                    <td className="px-4 py-3 font-mono text-gray-800">{d.lotId}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{d.processorName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={d.reason}>
                      {d.reason}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-700">
                      ₹{d.salvageValue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-[10px]">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
