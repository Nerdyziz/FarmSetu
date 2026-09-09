'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LanguageContext'
import { MOCK_LOTS } from '@/lib/mock-data'
import { createShipmentBooking } from '@/lib/supabase/services'

interface AvailableLot {
  id: string
  farmerName: string
  farmerNameHi: string
  crop: string
  weightKg: number
  crates: number
  grade: 'A' | 'B' | 'C'
  stagedLocation: string
}

const STAGED_PACS_LOTS: AvailableLot[] = [
  { id: 'L001', farmerName: 'Ramesh Patil', farmerNameHi: 'रमेश पाटिल', crop: 'Orange', weightKg: 800, crates: 32, grade: 'A', stagedLocation: 'Pre-Cool Bay 1 (5.5°C)' },
  { id: 'L002', farmerName: 'Sunita Devi', farmerNameHi: 'सुनीता देवी', crop: 'Orange', weightKg: 450, crates: 18, grade: 'B', stagedLocation: 'Pre-Cool Bay 2 (5.5°C)' },
  { id: 'L004', farmerName: 'Ramesh Patil', farmerNameHi: 'रमेश पाटिल', crop: 'Orange', weightKg: 380, crates: 15, grade: 'A', stagedLocation: 'Pre-Cool Bay 1 (5.5°C)' },
  { id: 'L007', farmerName: 'Amol Deshmukh', farmerNameHi: 'अमोल देशमुख', crop: 'Orange', weightKg: 1250, crates: 50, grade: 'A', stagedLocation: 'Pre-Cool Bay 3 (5.5°C)' },
  { id: 'L008', farmerName: 'Ganesh Raut', farmerNameHi: 'गणेश राउत', crop: 'Orange', weightKg: 920, crates: 37, grade: 'B', stagedLocation: 'Pre-Cool Bay 2 (5.5°C)' },
  { id: 'L003', farmerName: 'Balu Shinde', farmerNameHi: 'बालू शिंदे', crop: 'Orange', weightKg: 620, crates: 25, grade: 'C', stagedLocation: 'Ambient Bay 4 (Juice)' },
]

interface FleetTruck {
  id: string
  type: string
  regNo: string
  capacityTons: number
  coolingType: string
  driverName: string
  driverPhone: string
  baseFreight: number
  etaMinutes: number
  rating: number
}

const FLEET_TRUCKS: FleetTruck[] = [
  {
    id: 'TRK-01',
    type: '16-Ton Multi-Axle Reefer (Recommended)',
    regNo: 'MH-31-RF-8840',
    capacityTons: 16,
    coolingType: 'Active Cold-Unit (Pre-set 5.5°C)',
    driverName: 'Vinod Yadav',
    driverPhone: '+91 98221-44510',
    baseFreight: 22500,
    etaMinutes: 25,
    rating: 4.9,
  },
  {
    id: 'TRK-02',
    type: '10-Ton Quilt Insulated Truck',
    regNo: 'MH-31-TR-4521',
    capacityTons: 10,
    coolingType: 'Passive Thermal Quilt + Night Transit',
    driverName: 'Santosh Shinde',
    driverPhone: '+91 94230-18920',
    baseFreight: 15800,
    etaMinutes: 40,
    rating: 4.8,
  },
  {
    id: 'TRK-03',
    type: '6-Ton Feeder Eicher',
    regNo: 'MH-31-FD-3112',
    capacityTons: 6,
    coolingType: 'Ventilated Ambient (Short-Haul/Processing)',
    driverName: 'Anil Gaikwad',
    driverPhone: '+91 97654-32109',
    baseFreight: 9200,
    etaMinutes: 15,
    rating: 4.7,
  },
]

const CORRIDOR_DESTINATIONS = [
  {
    id: 'DEST-MUMBAI',
    name: 'Mumbai Vashi APMC / B2B Central Fulfillment Hub',
    corridor: 'Nagpur → Mumbai (Samruddhi Mahamarg)',
    distanceKm: 780,
    estTransitHours: 14,
    recommendedFor: 'Grade A / Premium Retail & Kirana',
  },
  {
    id: 'DEST-PUNE',
    name: 'Pune Wholesale Ag-Distribution Yard',
    corridor: 'Nagpur → Pune',
    distanceKm: 710,
    estTransitHours: 13,
    recommendedFor: 'Grade A & B Mixed Loads',
  },
  {
    id: 'DEST-JUICE',
    name: 'Vidarbha Citrus & Juice Processing Cluster',
    corridor: 'Nagpur Local Salvage',
    distanceKm: 42,
    estTransitHours: 2,
    recommendedFor: 'Grade C / Distress Bulk Lots',
  },
  {
    id: 'DEST-NASHIK',
    name: 'Nashik Perishable Cold Chain Hub',
    corridor: 'Nagpur → Nashik',
    distanceKm: 620,
    estTransitHours: 11,
    recommendedFor: 'Domestic Grade B Consolidation',
  },
]

interface BookingRecord {
  bookingId: string
  manifestNo: string
  truck: FleetTruck
  destination: typeof CORRIDOR_DESTINATIONS[0]
  selectedLotIds: string[]
  totalWeightKg: number
  totalCrates: number
  blePodId: string
  fuelAdvancePaid: number
  balanceOnGeofence: number
  totalFreight: number
  bookedAt: string
  status: 'Loading at PACS' | 'En Route' | 'Delivered'
}

export default function TruckBookingPage() {
  const { lang } = useLang()

  const [selectedLots, setSelectedLots] = useState<string[]>(['L001', 'L002', 'L004'])
  const [selectedTruckId, setSelectedTruckId] = useState<string>('TRK-01')
  const [selectedDestId, setSelectedDestId] = useState<string>('DEST-MUMBAI')
  const [blePodId, setBlePodId] = useState<string>('BLE-POD-8821')
  const [isBooking, setIsBooking] = useState(false)
  const [activeBooking, setActiveBooking] = useState<BookingRecord | null>(null)

  // Past & active dispatches list
  const [bookings, setBookings] = useState<BookingRecord[]>([
    {
      bookingId: 'TB-901',
      manifestNo: 'MANIFEST-NGP-2026-0908-01',
      truck: FLEET_TRUCKS[1],
      destination: CORRIDOR_DESTINATIONS[0],
      selectedLotIds: ['L001'],
      totalWeightKg: 800,
      totalCrates: 32,
      blePodId: 'BLE-POD-7714',
      fuelAdvancePaid: 11060,
      balanceOnGeofence: 4740,
      totalFreight: 15800,
      bookedAt: '2026-09-08 07:30 PM',
      status: 'En Route',
    },
  ])

  const toggleLot = (id: string) => {
    setSelectedLots((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Calculate totals for selected lots
  const currentLots = STAGED_PACS_LOTS.filter((l) => selectedLots.includes(l.id))
  const totalWeightKg = currentLots.reduce((sum, l) => sum + l.weightKg, 0)
  const totalCrates = currentLots.reduce((sum, l) => sum + l.crates, 0)
  const totalTons = (totalWeightKg / 1000).toFixed(2)

  const chosenTruck = FLEET_TRUCKS.find((t) => t.id === selectedTruckId) || FLEET_TRUCKS[0]
  const chosenDest = CORRIDOR_DESTINATIONS.find((d) => d.id === selectedDestId) || CORRIDOR_DESTINATIONS[0]

  // Commercials (70% fuel advance gate settlement, 30% geofence)
  const totalFreight = chosenTruck.baseFreight
  const fuelAdvance70 = Math.round(totalFreight * 0.7)
  const balance30 = totalFreight - fuelAdvance70

  const handleBookTruck = () => {
    if (selectedLots.length === 0) return
    setIsBooking(true)

    setTimeout(async () => {
      const newBooking: BookingRecord = {
        bookingId: `TB-${Math.floor(100 + Math.random() * 900)}`,
        manifestNo: `MANIFEST-NGP-2026-${Date.now().toString().slice(-6)}`,
        truck: chosenTruck,
        destination: chosenDest,
        selectedLotIds: [...selectedLots],
        totalWeightKg,
        totalCrates,
        blePodId,
        fuelAdvancePaid: fuelAdvance70,
        balanceOnGeofence: balance30,
        totalFreight,
        bookedAt: 'Just Now',
        status: 'Loading at PACS',
      }

      await createShipmentBooking({
        id: newBooking.manifestNo,
        lotIds: newBooking.selectedLotIds,
        origin: 'Nagpur Central PACS Hub',
        destination: chosenDest.name,
        truckId: chosenTruck.regNo,
        driverName: chosenTruck.driverName,
        driverPhone: chosenTruck.driverPhone,
        totalWeightKg: newBooking.totalWeightKg,
        totalCrates: newBooking.totalCrates,
        blePodId: newBooking.blePodId,
      })

      setActiveBooking(newBooking)
      setBookings((prev) => [newBooking, ...prev])
      setIsBooking(false)
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
            <span>🚛</span>
            <span>{lang === 'hi' ? 'PACS ट्रक बुकिंग और माल समेकन' : 'PACS Truck Booking & Load Consolidation'}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {lang === 'hi'
              ? 'PACS संचालक किसानों के विभिन्न लॉट एकत्रित कर 10–20 टन का पूरा ट्रक लोड बुक करें (क्रेता से स्वतंत्र - हब से हब पारगमन)'
              : 'PACS Operator: Aggregate small farm loads into 10–20T consolidated trucks for transit (corridor-level, independent of individual buyers)'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/operator/logistics"
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <span>📡</span>
            <span>{lang === 'hi' ? 'लाइव अरहेनियस टेलीमेट्री' : 'Live Arrhenius Telemetry'}</span>
          </Link>
        </div>
      </div>

      {/* Booking Confirmation Gate Pass Modal / Alert */}
      {activeBooking && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 shadow-md animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white text-2xl flex items-center justify-center shadow">
                ✅
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {lang === 'hi' ? 'ट्रक सफलतापूर्वक बुक हुआ!' : 'Truck Booked & Dispatched!'}
                </span>
                <h2 className="text-xl font-bold text-emerald-950 mt-1">
                  Gate Pass #{activeBooking.bookingId} — {activeBooking.manifestNo}
                </h2>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Truck: <strong>{activeBooking.truck.regNo}</strong> ({activeBooking.truck.driverName}) · Assigned Pod: <span className="font-mono font-bold">{activeBooking.blePodId}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveBooking(null)}
              className="text-emerald-700 hover:text-emerald-900 text-lg font-bold p-1"
            >✕</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs bg-white/80 p-3.5 rounded-xl border border-emerald-200">
            <div>
              <span className="text-gray-500">{lang === 'hi' ? 'समेकित वजन:' : 'Consolidated Load:'}</span>
              <div className="font-bold text-gray-800 text-sm">{activeBooking.totalWeightKg} kg ({activeBooking.totalCrates} crates)</div>
            </div>
            <div>
              <span className="text-gray-500">{lang === 'hi' ? 'गंतव्य कॉरिडोर:' : 'Corridor Destination:'}</span>
              <div className="font-bold text-gray-800 text-sm">{activeBooking.destination.name.split('/')[0]}</div>
            </div>
            <div>
              <span className="text-gray-500">{lang === 'hi' ? '70% गेट ईंधन अग्रिम:' : '70% Gate Fuel Advance:'}</span>
              <div className="font-bold text-emerald-700 text-sm">₹{activeBooking.fuelAdvancePaid.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-500">{lang === 'hi' ? '30% जियोफेंस शेष:' : '30% Geofence Balance:'}</span>
              <div className="font-bold text-blue-700 text-sm">₹{activeBooking.balanceOnGeofence.toLocaleString()}</div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Link
              href="/operator/logistics"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <span>📡</span>
              <span>{lang === 'hi' ? 'अरहेनियस गेज पर लाइव ट्रैक करें' : 'Track on Arrhenius Live Monitor'}</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold text-xs rounded-xl transition"
            >
              🖨️ {lang === 'hi' ? 'गेट पास प्रिंट करें' : 'Print Waybill Manifest'}
            </button>
          </div>
        </div>
      )}

      {/* Main Consolidation & Booking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lot Consolidation Selector */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Select Lots to Load */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="font-bold text-gray-800 text-base">
                  {lang === 'hi' ? 'PACS कोल्ड स्टोर में तैयार लॉट चुनें (Consolidation)' : 'Select Graded Lots Staged at PACS'}
                </h2>
              </div>
              <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-full">
                {selectedLots.length} / {STAGED_PACS_LOTS.length} {lang === 'hi' ? 'चयनित' : 'Selected'}
              </span>
            </div>

            {/* Lot Checkboxes Table */}
            <div className="space-y-2.5">
              {STAGED_PACS_LOTS.map((lot) => {
                const isChecked = selectedLots.includes(lot.id)
                return (
                  <div
                    key={lot.id}
                    onClick={() => toggleLot(lot.id)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
                      isChecked
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div onClick
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-400 cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          <span>{lang === 'hi' ? lot.farmerNameHi : lot.farmerName}</span>
                          <span className="text-[11px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                            {lot.id}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>🍊 {lot.crop}</span>
                          <span>•</span>
                          <span>{lot.crates} {lang === 'hi' ? 'क्रेट' : 'crates'}</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">{lot.stagedLocation}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-sm">{lot.weightKg} kg</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase grade-${lot.grade.toLowerCase()}`}>
                        Grade {lot.grade}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Aggregated Payload Bar */}
            <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-400">{lang === 'hi' ? 'कुल समेकित पेलोड:' : 'Consolidated Truck Payload:'}</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {totalWeightKg.toLocaleString()} kg <span className="text-sm font-normal text-gray-300">({totalTons} Tons)</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">{lang === 'hi' ? 'कुल क्रेट्स:' : 'Total Crates:'}</div>
                <div className="text-lg font-bold text-white">{totalCrates} Crates</div>
              </div>
            </div>
          </div>

          {/* STEP 2: Choose Destination Hub */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="font-bold text-gray-800 text-base">
                {lang === 'hi' ? 'गंतव्य कॉरिडोर व हब चुनें' : 'Choose Corridor Transit Destination'}
              </h2>
            </div>

            <div className="space-y-2.5">
              {CORRIDOR_DESTINATIONS.map((dest) => {
                const isSelected = selectedDestId === dest.id
                return (
                  <div
                    key={dest.id}
                    onClick={() => setSelectedDestId(dest.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{dest.name}</div>
                      <div className="text-xs text-indigo-700 font-medium mt-0.5">
                        🛣️ {dest.corridor} ({dest.distanceKm} km · ~{dest.estTransitHours}h transit)
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Best fit: {dest.recommendedFor}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Fleet Selection, BLE Pod & Commercials */}
        <div className="lg:col-span-5 space-y-6">
          {/* STEP 3: Fleet Truck Selection */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="font-bold text-gray-800 text-base">
                {lang === 'hi' ? 'स्थानीय फ्लीट व वाहन चुनें' : 'Select Local Fleet Vehicle'}
              </h2>
            </div>

            <div className="space-y-3">
              {FLEET_TRUCKS.map((truck) => {
                const isSelected = selectedTruckId === truck.id
                return (
                  <div
                    key={truck.id}
                    onClick={() => setSelectedTruckId(truck.id)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-gray-800 text-sm">{truck.type}</div>
                        <div className="text-xs text-blue-700 font-mono font-semibold mt-0.5">
                          {truck.regNo}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-sm">₹{truck.baseFreight.toLocaleString()}</div>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">
                          ★ {truck.rating}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-0.5">
                      <div>❄️ {truck.coolingType}</div>
                      <div>👤 {truck.driverName} ({truck.driverPhone}) · ETA to PACS: {truck.etaMinutes} mins</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* STEP 4: Sensor & Commercials */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="font-bold text-gray-800 text-base">
                {lang === 'hi' ? 'BLE सेंसर व भुगतान अग्रिम' : 'IoT Sensor & Gate Fuel Advance'}
              </h2>
            </div>

            {/* BLE Pod Assignment */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {lang === 'hi' ? 'वायरलेस BLE IoT सेंसर पॉड असाइन करें:' : 'Assign Wireless BLE IoT Sensor Pod:'}
              </label>
              <select
                value={blePodId}
                onChange={(e) => setBlePodId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-blue-400 focus:outline-none"
              >
                <option value="BLE-POD-8821">BLE-POD-8821 (Dual Temp/Hum Sensor, 15-min Pings, 100% Bat)</option>
                <option value="BLE-POD-7714">BLE-POD-7714 (Active Arrhenius Kinetic Sync)</option>
                <option value="BLE-POD-9920">BLE-POD-9920 (Pre-calibrated 5.5°C threshold)</option>
              </select>
            </div>

            {/* SIH Financial Flow Box */}
            <div className="bg-gradient-to-br from-gray-50 to-orange-50/40 p-3.5 rounded-xl border border-orange-200 text-xs space-y-2">
              <div className="font-bold text-gray-800 flex items-center justify-between">
                <span>{lang === 'hi' ? 'भाड़ा व वित्तीय भुगतान संरचना:' : 'Freight & Working Capital Rail:'}</span>
                <span className="text-orange-700 font-bold">₹{totalFreight.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>⛽ 70% Gate Advance (PACS वेईब्रिज पर):</span>
                <span className="font-bold text-emerald-700">₹{fuelAdvance70.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>🏁 30% Geofence Balance (गंतव्य पहुंचने पर):</span>
                <span className="font-bold text-blue-700">₹{balance30.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-gray-400 pt-1 border-t border-orange-200/60">
                * Governed by FarmSetu logistics rail — Driver receives 70% fuel at dispatch, 30% on GPS arrival.
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleBookTruck}
              disabled={isBooking || selectedLots.length === 0}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isBooking ? (
                <span>⏳ {lang === 'hi' ? 'ट्रक बुक हो रहा है और गेट पास जारी हो रहा है…' : 'Booking Truck & Generating Manifest…'}</span>
              ) : (
                <span>🚛 {lang === 'hi' ? 'ट्रक बुक करें और गेट पास जारी करें' : 'Confirm Booking & Dispatch Truck'}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dispatched & Scheduled Trucks History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h2 className="font-bold text-gray-800">
              {lang === 'hi' ? 'सक्रिय और निर्धारित ट्रक डिस्पैच' : 'Booked & Active Truck Dispatches'}
            </h2>
          </div>
          <span className="text-xs text-gray-400">{bookings.length} Trucks Managed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Manifest / Gate Pass</th>
                <th className="px-4 py-3 text-left">Vehicle / Reg No</th>
                <th className="px-4 py-3 text-left">Driver</th>
                <th className="px-4 py-3 text-left">Corridor Route</th>
                <th className="px-4 py-3 text-left">Payload Weight</th>
                <th className="px-4 py-3 text-left">BLE Pod</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.bookingId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono font-bold text-blue-700">
                    {b.manifestNo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{b.truck.regNo}</div>
                    <div className="text-[10px] text-gray-400">{b.truck.capacityTons}T {b.truck.coolingType.split(' ')[0]}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {b.truck.driverName}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.destination.name.split('/')[0]}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {b.totalWeightKg} kg ({b.totalCrates} crates)
                  </td>
                  <td className="px-4 py-3 font-mono text-indigo-700 font-semibold">
                    {b.blePodId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href="/operator/logistics"
                      className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <span>📡</span>
                      <span>Track</span>
                    </Link>
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
