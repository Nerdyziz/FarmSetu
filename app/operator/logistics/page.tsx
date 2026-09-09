'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useLang } from '@/lib/i18n/LanguageContext'
import { calcShelfLife } from '@/lib/arrhenius'
import {
  fetchShipments,
  fetchStandingBids,
  simulateShipmentDelivery,
  simulateShipmentDiversion,
  resetShipmentSimulation,
  updateShipmentProgress,
  getSimulationState,
  saveSimulationState,
  ShipmentRecord,
  StandingBidRecord,
} from '@/lib/supabase/services'

interface RouteMilestone {
  step: number
  titleEn: string
  titleHi: string
  km: number
  pct: number
  tempSafe: number
  tempExcursion: number
  descEn: string
  descHi: string
  fundStatusEn: string
  fundStatusHi: string
}

const CORRIDOR_MILESTONES: RouteMilestone[] = [
  {
    step: 0,
    titleEn: 'Nagpur Central PACS Hub (Origin)',
    titleHi: 'नागपुर सेंट्रल PACS हब (प्रस्थान)',
    km: 0,
    pct: 0,
    tempSafe: 5.2,
    tempExcursion: 5.2,
    descEn: 'Truck weighed, loaded & dispatched with pre-cooled oranges at 5.2°C.',
    descHi: '5.2°C पर संतरा लोड हुआ, वजन जांचा और रवाना हुआ।',
    fundStatusEn: '70% Farmer Advance & 70% Fuel Advance Released',
    fundStatusHi: '70% किसान अग्रिम और 70% ईंधन अग्रिम जारी',
  },
  {
    step: 1,
    titleEn: 'Karanja Lad Interchange (Samruddhi)',
    titleHi: 'कारंजा लाड इंटरचेंज (समृद्धि मार्ग)',
    km: 218,
    pct: 28,
    tempSafe: 5.8,
    tempExcursion: 9.4,
    descEn: 'Samruddhi Expressway waypoint. Active reefer running normally.',
    descHi: 'समृद्धि महामार्ग वेपॉइंट। कोल्ड-चेन सामान्य रूप से कार्यरत।',
    fundStatusEn: '70% Paid · 30% In Escrow Transit Vault',
    fundStatusHi: '70% भुगतान हुआ · 30% एस्क्रो तिजोरी में',
  },
  {
    step: 2,
    titleEn: 'Mehkar / Jalna Cold-Chain Corridor Checkpoint',
    titleHi: 'मेहकर / जालना कोल्ड-चेन चेकपॉइंट',
    km: 422,
    pct: 54,
    tempSafe: 6.1,
    tempExcursion: 16.5,
    descEn: 'Midpoint corridor audit. BLE Pod 15-min kinetic telemetry verified.',
    descHi: 'मध्यवर्ती चेकपॉइंट। BLE पॉड 15-मिनट टेलीमेट्री सत्यापित।',
    fundStatusEn: '70% Paid · 30% In Escrow Transit Vault',
    fundStatusHi: '70% भुगतान हुआ · 30% एस्क्रो तिजोरी में',
  },
  {
    step: 3,
    titleEn: 'Igatpuri / Kasara Ghat Incline',
    titleHi: 'इगतपुरी / कसारा घाट',
    km: 650,
    pct: 83,
    tempSafe: 6.4,
    tempExcursion: 17.2,
    descEn: 'Approaching Mumbai MMR region. Pre-cooling shelf-life remains robust.',
    descHi: 'मुंबई एमएमआर क्षेत्र के करीब। पूर्व-शीतलन ताजगी सुरक्षित।',
    fundStatusEn: '70% Paid · 30% In Escrow Transit Vault',
    fundStatusHi: '70% भुगतान हुआ · 30% एस्क्रो तिजोरी में',
  },
  {
    step: 4,
    titleEn: 'Mumbai Vashi APMC Central Geofence (Destination)',
    titleHi: 'मुंबई वाशी एपीएमसी सेंट्रल जियोफेंस (गंतव्य)',
    km: 780,
    pct: 100,
    tempSafe: 6.6,
    tempExcursion: 17.8,
    descEn: 'Truck crossed buyer hub geofence. Waybill QR scanned and verified.',
    descHi: 'ट्रक ने खरीदार हब जियोफेंस पार किया। वे-बिल QR सत्यापित।',
    fundStatusEn: '100% Funds Released to Farmer (Remaining 30% Settled)',
    fundStatusHi: '100% किसान भुगतान जारी (शेष 30% अंतिम निपटान)',
  },
]

export default function OperatorLogisticsPage() {
  const { lang } = useLang()

  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null)
  const [processorBids, setProcessorBids] = useState<StandingBidRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Persistent Simulation State
  const [simStep, setSimStep] = useState<number>(1)
  const [simScenario, setSimScenario] = useState<'safe' | 'excursion'>('safe')
  const [isSimulating, setIsSimulating] = useState(false)
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const [runSpeedMs, setRunSpeedMs] = useState(2500)
  const [simAlertMsg, setSimAlertMsg] = useState<string | null>(null)

  // Load shipments & standing processor bids, restoring persistent state from localStorage
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [shipRes, bidRes] = await Promise.all([
        fetchShipments(),
        fetchStandingBids(),
      ])
      setShipments(shipRes.shipments)

      const savedSim = getSimulationState()
      let initialShipment = shipRes.shipments[0]
      if (savedSim && savedSim.shipmentId) {
        const found = shipRes.shipments.find((s) => s.id === savedSim.shipmentId)
        if (found) {
          initialShipment = found
          setSimStep(savedSim.simStep ?? 1)
          setSimScenario(savedSim.simScenario ?? 'safe')
        }
      } else if (initialShipment) {
        if (initialShipment.status === 'arrived') {
          setSimStep(4)
          setSimScenario('safe')
        } else if (initialShipment.status === 'diverted') {
          setSimStep(2)
          setSimScenario('excursion')
        } else {
          setSimStep(1)
          setSimScenario('safe')
        }
      }
      setSelectedShipment(initialShipment)
      setProcessorBids(bidRes.bids)
      setLoading(false)
    }
    loadData()
  }, [])

  // Listen for real-time simulation updates across tabs & windows
  useEffect(() => {
    const handleSync = (e?: any) => {
      const sim = e?.detail || getSimulationState()
      if (!sim) return
      if (selectedShipment && sim.shipmentId === selectedShipment.id) {
        if (sim.simStep !== undefined) setSimStep(sim.simStep)
        if (sim.simScenario !== undefined) setSimScenario(sim.simScenario)
      }
    }
    window.addEventListener('farmsetu_simulation_update', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('farmsetu_simulation_update', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [selectedShipment?.id])

  // Select shipment without clobbering persistent state
  const handleSelectShipment = (s: ShipmentRecord) => {
    setIsAutoRunning(false)
    setSelectedShipment(s)
    const savedSim = getSimulationState()
    if (savedSim && savedSim.shipmentId === s.id) {
      setSimStep(savedSim.simStep ?? 1)
      setSimScenario(savedSim.simScenario ?? 'safe')
    } else {
      if (s.status === 'arrived') {
        setSimStep(4)
        setSimScenario('safe')
      } else if (s.status === 'diverted') {
        setSimStep(2)
        setSimScenario('excursion')
      } else {
        setSimStep(1)
        setSimScenario('safe')
      }
    }
  }

  // Real-time Auto-Run Simulation interval ticker
  useEffect(() => {
    if (!isAutoRunning || !selectedShipment) return

    const timer = setInterval(() => {
      setSimStep((prevStep) => {
        const nextStep = prevStep + 1
        if (nextStep > 4) {
          setIsAutoRunning(false)
          return prevStep
        }

        const m = CORRIDOR_MILESTONES[nextStep]
        const temp = simScenario === 'excursion' ? m.tempExcursion : m.tempSafe

        // At checkpoint 2 with excursion scenario -> Trigger diversion
        if (nextStep === 2 && simScenario === 'excursion') {
          setIsAutoRunning(false)
          handleSimulateExcursionAndDivert(processorBids[0] || { processorName: 'Nagpur Industrial Juice Plant', pricePerKg: 15 })
          return 2
        }

        // At destination step 4 -> Trigger geofence delivery & 100% final settlement
        if (nextStep === 4) {
          setIsAutoRunning(false)
          handleSimulateDelivery()
          return 4
        }

        // Mid-route waypoint update
        updateShipmentProgress(selectedShipment.id, m.pct, temp, m.titleEn, nextStep, simScenario)
        return nextStep
      })
    }, runSpeedMs)

    return () => clearInterval(timer)
  }, [isAutoRunning, selectedShipment?.id, simScenario, runSpeedMs, processorBids])

  const toggleAutoRun = () => {
    if (isAutoRunning) {
      setIsAutoRunning(false)
    } else {
      // If truck already arrived or diverted, reset to step 0 to replay corridor journey
      if (simStep >= 4 || selectedShipment?.status === 'diverted' || selectedShipment?.status === 'arrived') {
        setSimStep(0)
        const m0 = CORRIDOR_MILESTONES[0]
        if (selectedShipment) {
          updateShipmentProgress(selectedShipment.id, 0, m0.tempSafe, m0.titleEn, 0, simScenario)
        }
      }
      setIsAutoRunning(true)
    }
  }

  const handleScenarioChange = (scen: 'safe' | 'excursion') => {
    setSimScenario(scen)
    if (!selectedShipment) return
    const m = CORRIDOR_MILESTONES[simStep]
    const temp = scen === 'excursion' ? m.tempExcursion : m.tempSafe
    updateShipmentProgress(selectedShipment.id, m.pct, temp, m.titleEn, simStep, scen)
  }

  // Trigger: Milestone jump
  const handleMilestoneSelect = async (step: number) => {
    setIsAutoRunning(false)
    setSimStep(step)
    if (!selectedShipment) return
    const m = CORRIDOR_MILESTONES[step]
    const temp = simScenario === 'excursion' ? m.tempExcursion : m.tempSafe
    if (step === 4) {
      await handleSimulateDelivery()
    } else if (step === 2 && simScenario === 'excursion') {
      await handleSimulateExcursionAndDivert(processorBids[0] || { processorName: 'Nagpur Industrial Juice Plant', pricePerKg: 15 })
    } else {
      await updateShipmentProgress(selectedShipment.id, m.pct, temp, m.titleEn, step, simScenario)
      const updated = await fetchShipments()
      setShipments(updated.shipments)
    }
  }

  // Trigger: Successful Geofence Arrival Simulation
  const handleSimulateDelivery = async () => {
    if (!selectedShipment) return
    setIsAutoRunning(false)
    setIsSimulating(true)
    setSimScenario('safe')
    setSimStep(4)
    await simulateShipmentDelivery(selectedShipment.id)
    const updated = await fetchShipments()
    setShipments(updated.shipments)
    const curr = updated.shipments.find((s) => s.id === selectedShipment.id)
    if (curr) setSelectedShipment(curr)

    setSimAlertMsg(
      lang === 'hi'
        ? '🎉 खरीदार जियोफेंस डिलीवरी स्वीकार हुई! किसानों को शेष 30% अंतिम भुगतान (कुल 100%) जारी कर दिया गया।'
        : '🎉 Buyer Geofence Delivery Accepted! Remaining 30% final balance (100% full value) released to farmers.'
    )
    setIsSimulating(false)
  }

  // Trigger: Thermal Excursion & Diversion Simulation
  const handleSimulateExcursionAndDivert = async (bid: any) => {
    if (!selectedShipment) return
    setIsAutoRunning(false)
    setIsSimulating(true)
    setSimScenario('excursion')
    setSimStep(2)
    await simulateShipmentDiversion(
      selectedShipment.id,
      bid?.processorName || 'Nagpur Industrial Juice Plant',
      bid?.pricePerKg || 15,
      'Arrhenius kinetic thermal excursion above 12°C — diverted to juice processor'
    )
    const updated = await fetchShipments()
    setShipments(updated.shipments)
    const curr = updated.shipments.find((s) => s.id === selectedShipment.id)
    if (curr) setSelectedShipment(curr)

    setSimAlertMsg(
      lang === 'hi'
        ? `🚨 तापमान बढ़ गया (16.5°C)! ट्रक को ${bid?.processorName || 'नागपुर जूस प्लांट'} की ओर मोड़ा गया। किसान का 70% अग्रिम PACS एस्क्रो गारंटी द्वारा सुरक्षित है।`
        : `🚨 Thermal Spike (16.5°C)! Diverted to ${bid?.processorName || 'Nagpur Industrial Juice Plant'}. 70% Farmer Advance protected by PACS guarantee.`
    )
    setIsSimulating(false)
  }

  // Trigger: Reset Simulation
  const handleResetSimulation = async () => {
    if (!selectedShipment) return
    setIsAutoRunning(false)
    setIsSimulating(true)
    setSimScenario('safe')
    setSimStep(1)
    await resetShipmentSimulation(selectedShipment.id)
    const updated = await fetchShipments()
    setShipments(updated.shipments)
    const curr = updated.shipments.find((s) => s.id === selectedShipment.id)
    if (curr) setSelectedShipment(curr)
    setSimAlertMsg(null)
    setIsSimulating(false)
  }

  if (loading || !selectedShipment) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        {lang === 'hi' ? '⏳ लॉजिस्टिक्स टेलीमेट्री लोड हो रही है…' : '⏳ Loading Logistics Telemetry & Fleet Tracker…'}
      </div>
    )
  }

  const currentMilestone = CORRIDOR_MILESTONES[simStep] || CORRIDOR_MILESTONES[0]
  const currentTemp = simScenario === 'excursion' ? currentMilestone.tempExcursion : currentMilestone.tempSafe

  // Telemetry points for chart
  const telemetry = selectedShipment.telemetry && selectedShipment.telemetry.length > 0
    ? selectedShipment.telemetry
    : [
        { timestamp: Date.now() - 3600000 * 5, tempC: 5.2 },
        { timestamp: Date.now() - 3600000 * 4, tempC: 5.5 },
        { timestamp: Date.now() - 3600000 * 3, tempC: 5.8 },
        { timestamp: Date.now() - 3600000 * 2, tempC: simScenario === 'excursion' ? 12.4 : 6.0 },
        { timestamp: Date.now() - 3600000 * 1, tempC: currentTemp },
      ]

  const shelfInfo = calcShelfLife(telemetry, selectedShipment.initialShelfLifeHours)

  const tempChartData = telemetry.map((r, i) => ({
    time: `${i * 15}m`,
    temp: r.tempC,
  }))

  const statusColor = shelfInfo.status === 'safe'
    ? 'text-green-700 bg-green-50 border-green-300'
    : shelfInfo.status === 'at-risk'
    ? 'text-yellow-700 bg-yellow-50 border-yellow-300'
    : 'text-red-700 bg-red-50 border-red-300'

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>📡</span>
            <span>{lang === 'hi' ? 'PACS लॉजिस्टिक्स व लाइव रूट ट्रैकर' : 'PACS Logistics & Live Route Tracker'}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {lang === 'hi'
              ? 'समेकित ट्रक डिस्पैच, अरहेनियस शेल्फ-लाइफ गेज, लाइव वेपॉइंट ट्रैकिंग और एस्क्रो भुगतान रिलीज का सिमुलेशन'
              : 'Consolidated truck dispatches, Arrhenius shelf-life kinetics, corridor milestone tracking & escrow fund release'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/operator/truck-booking"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>🚛</span>
            <span>{lang === 'hi' ? '+ नया ट्रक लोड बुक करें' : '+ Book Consolidated Truck'}</span>
          </Link>
          <Link
            href="/operator/processor-bids"
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold rounded-xl transition"
          >
            <span>🏭</span>
            <span>{lang === 'hi' ? 'प्रोसेसर बोलियाँ' : 'Processor Bids'}</span>
          </Link>
        </div>
      </div>

      {/* Shipment Selector Tabs */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="text-xs font-semibold text-gray-500 mb-2">
          {lang === 'hi' ? 'सक्रिय डिस्पैच / शिपमेंट चुनें (Supabase से जुड़े):' : 'Select Active Dispatch / Shipment (Connected to Supabase):'}
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {shipments.map((s) => {
            const isSelected = selectedShipment.id === s.id
            const isDelivered = s.status === 'arrived'
            const isDiverted = s.status === 'diverted'
            return (
              <button
                key={s.id}
                onClick={() => handleSelectShipment(s)}
                className={`px-4 py-2.5 rounded-xl border-2 text-xs font-semibold transition flex items-center gap-2 flex-shrink-0 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-blue-800 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                }`}
              >
                <span>{isDiverted ? '🔴' : isDelivered ? '✅' : '🚚'}</span>
                <span className="font-mono font-bold">{s.id}</span>
                <span className="text-gray-400">·</span>
                <span>{s.truckId}</span>
                <span className="text-gray-400">·</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                  isDelivered ? 'bg-green-100 text-green-800' : isDiverted ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {s.status}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Alert Banner */}
      {simAlertMsg && (
        <div className={`p-4 rounded-2xl border-2 flex items-start justify-between gap-3 animate-fade-in ${
          simScenario === 'excursion'
            ? 'bg-red-50 border-red-400 text-red-900'
            : 'bg-emerald-50 border-emerald-400 text-emerald-950'
        }`}>
          <div className="text-sm font-semibold">{simAlertMsg}</div>
          <button
            onClick={() => setSimAlertMsg(null)}
            className="text-gray-500 hover:text-gray-800 font-bold p-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── INTERACTIVE ROUTE SIMULATOR & FUND RELEASE CONTROLS ── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800">
        {/* Simulator Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-indigo-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40">
                Interactive Corridor Simulator
              </span>
              <span className="text-xs text-indigo-200">
                Route: <strong>{selectedShipment.origin}</strong> → <strong>{selectedShipment.destination}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {lang === 'hi' ? 'मार्ग प्रगति और फंड रिलीज सिमुलेशन' : 'Route Transit Waypoint & Fund Release Simulator'}
            </h2>
          </div>

          {/* Action & Auto-Run Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Run Toggle Button */}
            <button
              onClick={toggleAutoRun}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 ${
                isAutoRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white ring-1 ring-indigo-400'
              }`}
            >
              <span>{isAutoRunning ? '⏸️' : '▶️'}</span>
              <span>
                {isAutoRunning
                  ? (lang === 'hi' ? 'रोकें (Pause)' : 'Pause Auto-Run')
                  : (lang === 'hi' ? 'लाइव ऑटो-रन' : 'Auto-Run Corridor')}
              </span>
            </button>

            {/* Speed Toggle */}
            <button
              onClick={() => setRunSpeedMs((prev) => (prev === 2500 ? 1200 : 2500))}
              className="px-2.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-semibold rounded-xl transition"
              title="Toggle speed"
            >
              ⚡ {runSpeedMs === 2500 ? '1x' : '2x'}
            </button>

            {/* Instant Delivery Button */}
            <button
              onClick={handleSimulateDelivery}
              disabled={isSimulating}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
            >
              <span>✅</span>
              <span>{lang === 'hi' ? '100% डिलीवरी' : '100% Delivery'}</span>
            </button>

            {/* Excursion Diversion Button */}
            <button
              onClick={() => handleSimulateExcursionAndDivert(processorBids[0] || { processorName: 'Nagpur Industrial Juice Plant', pricePerKg: 15 })}
              disabled={isSimulating}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5"
            >
              <span>🚨</span>
              <span>{lang === 'hi' ? 'जूस डायवर्जन' : 'Simulate Diversion'}</span>
            </button>

            {/* Reset Button */}
            <button
              onClick={handleResetSimulation}
              disabled={isSimulating}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition"
            >
              🔄 {lang === 'hi' ? 'रीसेट' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Corridor Scenario Selector Bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="text-xs text-indigo-200 font-medium flex items-center gap-1.5">
            <span>🎛️</span>
            <span>{lang === 'hi' ? 'सिमुलेशन परिदृश्य (Scenario):' : 'Corridor Scenario Mode:'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleScenarioChange('safe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                simScenario === 'safe'
                  ? 'bg-emerald-600 text-white shadow ring-1 ring-emerald-300'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span>🟢</span>
              <span>{lang === 'hi' ? 'सामान्य कोल्ड-चेन (5.2°C - 6.6°C)' : 'Normal Cold-Chain Route (Safe)'}</span>
            </button>
            <button
              onClick={() => handleScenarioChange('excursion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                simScenario === 'excursion'
                  ? 'bg-rose-600 text-white shadow ring-1 ring-rose-300'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              <span>🚨</span>
              <span>{lang === 'hi' ? 'कंप्रेसर फॉल्ट खतरा (मेहकर 16.5°C)' : 'Compressor Fault Risk (Spike at Mehkar)'}</span>
            </button>
          </div>
        </div>

        {/* Live Running Indicator Banner */}
        {isAutoRunning && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold">
                {lang === 'hi'
                  ? '▶️ लाइव सिमुलेशन सक्रिय है: किसान और PACS ऑपरेटर डैशबोर्ड पर रियल-टाइम में अपडेट भेजा जा रहा है…'
                  : '▶️ Live Simulation Active: Real-time telemetry & escrow progression syncing to Farmer & Operator Dashboards…'}
              </span>
            </div>
            <span className="font-mono text-indigo-300">Km {currentMilestone.km} / 780 ({currentMilestone.pct}%)</span>
          </div>
        )}

        {/* Milestone Corridor Stepper */}
        <div className="py-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {CORRIDOR_MILESTONES.map((m) => {
              const isPassed = simStep >= m.step
              const isCurrent = simStep === m.step
              return (
                <div
                  key={m.step}
                  onClick={() => handleMilestoneSelect(m.step)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-blue-600/30 border-blue-400 shadow-md ring-2 ring-blue-400'
                      : isPassed
                      ? 'bg-white/10 border-indigo-400/50 hover:bg-white/15'
                      : 'bg-black/30 border-gray-800 opacity-60 hover:opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-indigo-300">Km {m.km}</span>
                      <span className="font-mono text-gray-400">{m.pct}%</span>
                    </div>
                    <div className="font-semibold text-xs text-white line-clamp-2">
                      {lang === 'hi' ? m.titleHi : m.titleEn}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                    <span className={simScenario === 'excursion' && isPassed ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {simScenario === 'excursion' ? `${m.tempExcursion}°C` : `${m.tempSafe}°C`}
                    </span>
                    <span className="text-gray-300">
                      {isCurrent ? '📍 Here' : isPassed ? '✓ Done' : 'Next'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                simScenario === 'excursion'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600'
                  : 'bg-gradient-to-r from-blue-500 to-emerald-400'
              }`}
              style={{ width: `${currentMilestone.pct}%` }}
            />
          </div>
        </div>

        {/* Current Waypoint Status & Fund Release Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Truck Position Card */}
          <div className="bg-white/10 p-4 rounded-xl border border-white/10">
            <div className="text-xs text-indigo-300 font-medium">
              {lang === 'hi' ? '📍 ट्रक की वर्तमान स्थिति:' : '📍 Current Truck Waypoint:'}
            </div>
            <div className="text-base font-bold text-white mt-1">
              {lang === 'hi' ? currentMilestone.titleHi : currentMilestone.titleEn}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {lang === 'hi' ? currentMilestone.descHi : currentMilestone.descEn}
            </div>
            <div className="mt-2 text-xs text-indigo-200">
              Assigned BLE Pod: <span className="font-mono font-bold text-white">{selectedShipment.blePodId}</span> · Truck: <span className="font-mono font-bold text-white">{selectedShipment.truckId}</span>
            </div>
          </div>

          {/* Financial Fund Settlement Card */}
          <div className="bg-white/10 p-4 rounded-xl border border-white/10">
            <div className="text-xs text-indigo-300 font-medium">
              {lang === 'hi' ? '💰 फंड रिलीज स्थिति (किसान व चालक):' : '💰 Financial Escrow Rail Status:'}
            </div>
            <div className={`text-base font-bold mt-1 ${simStep === 4 ? 'text-emerald-400' : 'text-amber-300'}`}>
              {lang === 'hi' ? currentMilestone.fundStatusHi : currentMilestone.fundStatusEn}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {simStep === 4 ? (
                <span>🎉 Full ₹{((selectedShipment.totalWeightKg || 800) * 38).toLocaleString()} settled. Farmer bank credit confirmed via escrow rail.</span>
              ) : simScenario === 'excursion' ? (
                <span>🛡️ Farmer 70% advance protected by PACS guarantee. Salvage recovery logged in Supabase.</span>
              ) : (
                <span>70% advance paid at gate. Final 30% held in transit escrow until APMC geofence scan.</span>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Syncs with: <Link href="/farmer/dashboard" className="text-blue-300 underline">Farmer Dashboard</Link> & <Link href="/farmer/payments" className="text-blue-300 underline">Farmer Payments</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── ARRHENIUS GAUGE & TELEMETRY DETAILS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Arrhenius Gauge */}
        <div className={`rounded-2xl p-5 border-2 ${statusColor} shadow-sm bg-white`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-sm">
              {lang === 'hi' ? '🧪 Arrhenius ताजगी गेज' : '🧪 Arrhenius Shelf-Life Gauge'}
            </h2>
            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              k = A·e^(-Ea/RT)
            </span>
          </div>

          {/* Circular gauge */}
          <div className="flex flex-col items-center my-3">
            <svg width="130" height="130" viewBox="0 0 140 140">
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
            <div className="font-bold text-sm">
              {shelfInfo.status === 'safe'
                ? (lang === 'hi' ? '🟢 सुरक्षित' : '🟢 Safe — Continue Route')
                : shelfInfo.status === 'at-risk'
                ? (lang === 'hi' ? '🟡 खतरे में' : '🟡 At Risk — Monitor Closely')
                : (lang === 'hi' ? '🔴 मोड़ा गया' : '🔴 Diverted to Processor')}
            </div>
            <div className="text-xs mt-1 text-gray-500">
              {lang === 'hi' ? 'बचे घंटे:' : 'Hours left:'} {Math.round(shelfInfo.hoursRemaining)}h (Initial: {selectedShipment.initialShelfLifeHours}h)
            </div>
          </div>
        </div>

        {/* Shipment Details Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800 text-sm">
              {lang === 'hi' ? '📋 शिपमेंट विवरण' : '📋 Dispatch & Waybill Manifest'}
            </h2>
            <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded font-bold">
              {selectedShipment.id}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { label: lang === 'hi' ? 'चालक का नाम' : 'Driver', value: `${selectedShipment.driverName} (${selectedShipment.driverPhone})` },
              { label: lang === 'hi' ? 'वाहन नंबर' : 'Vehicle Reg', value: selectedShipment.truckId },
              { label: lang === 'hi' ? 'समेकित वजन' : 'Payload', value: `${selectedShipment.totalWeightKg} kg (${selectedShipment.totalCrates} crates)` },
              { label: lang === 'hi' ? 'स्रोत PACS' : 'Origin', value: selectedShipment.origin },
              { label: lang === 'hi' ? 'गंतव्य' : 'Destination', value: selectedShipment.destination },
              { label: lang === 'hi' ? 'वर्तमान तापमान' : 'Current Temp', value: `${currentTemp}°C` },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <div className="text-gray-400 text-[11px]">{item.label}</div>
                <div className="font-semibold text-gray-800 mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="text-gray-500">
              Linked Produce Lots: <span className="font-mono font-bold text-blue-700">{selectedShipment.lotIds.join(', ')}</span>
            </div>
            <Link
              href={`/operator/certificate/${selectedShipment.lotIds[0] || 'L001'}`}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>🔐</span>
              <span>{lang === 'hi' ? 'डिजिटल प्रमाण-पत्र देखें' : 'Inspect Quality Certificate'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── TEMPERATURE HISTORY & BLE TELEMETRY CHART ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">
              {lang === 'hi' ? '🌡️ तापमान इतिहास (BLE टेलीमेट्री Pings)' : '🌡️ Temperature History (BLE Telemetry Pings)'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Dual-sensor logging at 15-min intervals during transit
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Safe (≤ 8°C)</span>
            </div>
            <div className="flex items-center gap-1 text-rose-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Excursion (&gt; 12°C)</span>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={tempChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 25]} tick={{ fontSize: 10 }} unit="°C" />
            <Tooltip formatter={(v) => [`${v}°C`, lang === 'hi' ? 'तापमान' : 'Temperature']} />
            <Line
              type="monotone"
              dataKey="temp"
              stroke={simScenario === 'excursion' ? '#e11d48' : '#2563eb'}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── DIVERSION ENGINE PANEL ── */}
      {(shelfInfo.status !== 'safe' || simScenario === 'excursion') && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-rose-900 text-lg flex items-center gap-2">
                <span>🚨</span>
                <span>{lang === 'hi' ? 'Diversion Engine सक्रिय — प्रोसेसर को मोड़ें' : 'Diversion Engine Active — Salvage to Processor'}</span>
              </h2>
              <p className="text-rose-700 text-xs mt-1">
                {lang === 'hi'
                  ? `Arrhenius ताजगी घटकर ${Math.round(shelfInfo.fractionRemaining * 100)}% रह गई है। मंडी ले जाने पर 100% नुकसान होगा। पूर्व-अनुबंधित जूस प्रोसेसर को तुरंत मोड़ें:`
                  : `Shelf life depleted to ${Math.round(shelfInfo.fractionRemaining * 100)}%. Immediate diversion to contracted processor will recover salvage value:`}
              </p>
            </div>
            <Link
              href="/operator/processor-bids"
              className="text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-xl transition"
            >
              {lang === 'hi' ? 'सभी बोलियाँ देखें →' : 'View All Bids →'}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {processorBids.slice(0, 2).map((bid) => (
              <div key={bid.id} className="bg-white p-3.5 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-800 text-sm">{bid.processorName}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    📍 {bid.plantLocation} · Capacity: {bid.capacityTonsPerDay}T/day
                  </div>
                  <div className="text-xs text-emerald-700 font-bold mt-1">
                    Floor Bid: ₹{bid.pricePerKg}/kg
                  </div>
                </div>
                <button
                  onClick={() => handleSimulateExcursionAndDivert(bid)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow transition flex-shrink-0"
                >
                  {lang === 'hi' ? 'मोड़ें (Divert)' : 'Execute Diversion'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
