import { createClient, isSupabaseConfigured } from './client'
import {
  MOCK_LOTS,
  MOCK_SHIPMENTS,
  HARVEST_SLOTS,
  generatePriceForecast,
} from '@/lib/mock-data'
import { generateMockTelemetry } from '@/lib/arrhenius'
import { GradeResult } from '@/lib/grading'

// ─── 1. Types ──────────────────────────────────────────────────
export interface LotRecord {
  id: string
  farmerId: string
  farmerName: string
  farmerNameHi: string
  crop: string
  weightKg: number
  grade: 'A' | 'B' | 'C'
  score: number
  brixPct: number
  blemishPct: number
  uniformity: number
  certHash: string
  status: string
  createdAt: string
  pricePerKg: number
  escrowState: string
  paid70: number
  totalValue: number
}

export interface StandingBidRecord {
  id: string
  processorName: string
  commodity: string
  maxDistanceKm: number
  pricePerKg: number
  capacityTonsPerDay: number
  contactPhone: string
  plantLocation: string
  isActive: boolean
  createdAt: string
}

export interface ShipmentRecord {
  id: string
  lotIds: string[]
  origin: string
  destination: string
  truckId: string
  driverName: string
  driverPhone: string
  totalWeightKg: number
  totalCrates: number
  blePodId: string
  status: 'loading' | 'en-route' | 'arrived' | 'diverted'
  initialShelfLifeHours: number
  createdAt: string
  currentLocation?: string
  progressPct?: number
  currentTempC?: number
  divertedTo?: string
  fundsReleasedPct?: number // 70 or 100
  telemetry?: { timestamp: number; tempC: number }[]
}

export interface DiversionOrderRecord {
  id: string
  shipmentId: string
  lotId: string
  shelfLifePct: number
  reason: string
  processorName: string
  processorBidPerKg: number
  salvageValue: number
  status: 'pending' | 'accepted' | 'completed'
  createdAt: string
}

export interface HarvestSlotRecord {
  id: string
  farmerId: string
  farmerCode: string
  advisedDate: string
  advice: 'now' | 'soon' | 'wait'
  priceExpected: number
  cohortId: string
}

export interface EscrowTransactionRecord {
  id: string
  lotId: string
  fromState: string
  toState: string
  amount: number
  triggeredBy: string
  createdAt: string
}

export interface TelemetryRecord {
  id: string
  shipmentId: string
  tempC: number
  humidityPct?: number
  timestamp: number
}

// ─── Local State Stores (Resilient Offline Demo Fallback) ──────
let localLots: LotRecord[] = [...MOCK_LOTS]

let localStandingBids: StandingBidRecord[] = [
  {
    id: 'BID-01',
    processorName: 'Nagpur Industrial Juice Plant',
    commodity: 'Orange',
    maxDistanceKm: 50,
    pricePerKg: 15.0,
    capacityTonsPerDay: 40,
    contactPhone: '+91 712 254100',
    plantLocation: 'MIDC Hingna, Nagpur',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'BID-02',
    processorName: 'Vidarbha Agro Processing Co.',
    commodity: 'Orange',
    maxDistanceKm: 80,
    pricePerKg: 13.5,
    capacityTonsPerDay: 25,
    contactPhone: '+91 715 289122',
    plantLocation: 'MIDC Wardha',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'BID-03',
    processorName: 'Maharashtra Squash & Beverages',
    commodity: 'Orange',
    maxDistanceKm: 120,
    pricePerKg: 12.0,
    capacityTonsPerDay: 30,
    contactPhone: '+91 721 245901',
    plantLocation: 'Amravati Food Park',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'BID-04',
    processorName: 'Kisan Pulp & Concentrates Ltd.',
    commodity: 'Orange',
    maxDistanceKm: 65,
    pricePerKg: 14.2,
    capacityTonsPerDay: 50,
    contactPhone: '+91 712 290111',
    plantLocation: 'Kalmeshwar, Nagpur',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
]

let localShipments: ShipmentRecord[] = [
  {
    id: 'SH001',
    lotIds: ['L001'],
    origin: 'Nagpur Central PACS Hub',
    destination: 'Mumbai Vashi APMC B2B Hub',
    truckId: 'MH-31-RF-8840',
    driverName: 'Vinod Yadav',
    driverPhone: '+91 98221 44510',
    totalWeightKg: 800,
    totalCrates: 32,
    blePodId: 'BLE-POD-8821',
    status: 'en-route',
    initialShelfLifeHours: 240,
    currentLocation: 'Karanja Lad Interchange (Km 210 / 780)',
    progressPct: 45,
    currentTempC: 5.8,
    fundsReleasedPct: 70,
    telemetry: generateMockTelemetry(36, 6.2),
    createdAt: '2026-09-08T07:30:00Z',
  },
  {
    id: 'SH002',
    lotIds: ['L003'],
    origin: 'Amravati PACS Hub',
    destination: 'Nagpur Juice Plant',
    truckId: 'MH-31-TR-7823',
    driverName: 'Raju Bhai',
    driverPhone: '+91 94230 11223',
    totalWeightKg: 620,
    totalCrates: 25,
    blePodId: 'BLE-POD-7714',
    status: 'diverted',
    initialShelfLifeHours: 240,
    currentLocation: 'Diverted to Nagpur Industrial Juice Plant (MIDC Hingna)',
    progressPct: 100,
    currentTempC: 16.4,
    divertedTo: 'Nagpur Industrial Juice Plant',
    fundsReleasedPct: 70,
    telemetry: generateMockTelemetry(24, 14, 8),
    createdAt: '2026-09-08T06:00:00Z',
  },
]

let localDiversions: DiversionOrderRecord[] = [
  {
    id: 'DIV-001',
    shipmentId: 'SH002',
    lotId: 'L003',
    shelfLifePct: 18.5,
    reason: 'Arrhenius thermal excursion above 12°C in transit — salvage route triggered',
    processorName: 'Nagpur Industrial Juice Plant',
    processorBidPerKg: 15.0,
    salvageValue: 9300,
    status: 'accepted',
    createdAt: '2026-09-08T09:15:00Z',
  },
]

let localEscrow: EscrowTransactionRecord[] = [
  {
    id: 'ESC-001',
    lotId: 'L001',
    fromState: 'LOCKED',
    toState: 'PARTIAL_RELEASED',
    amount: 21280,
    triggeredBy: 'PACS Drop-off Verification',
    createdAt: '2026-09-07T10:00:00Z',
  },
  {
    id: 'ESC-002',
    lotId: 'L004',
    fromState: 'PARTIAL_RELEASED',
    toState: 'FULLY_RELEASED',
    amount: 4788,
    triggeredBy: 'Buyer Geofence Delivery Acceptance',
    createdAt: '2026-09-06T18:00:00Z',
  },
]

// ─── 2. Table: lots ─────────────────────────────────────────────
export async function fetchLots(): Promise<{ lots: LotRecord[]; isLiveDb: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('lots')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        if (data.length > 0) {
          const mapped: LotRecord[] = data.map((d: any) => ({
            id: d.id,
            farmerId: d.farmer_id || 'f1',
            farmerName: d.farmer_name || 'Ramesh Patil',
            farmerNameHi: d.farmer_name_hi || 'रमेश पाटिल',
            crop: d.crop_type || 'Orange',
            weightKg: Number(d.weight_kg) || 0,
            grade: (d.grade as 'A' | 'B' | 'C') || 'B',
            score: d.score || 70,
            brixPct: Number(d.brix_pct) || 10,
            blemishPct: Number(d.blemish_pct) || 5,
            uniformity: Number(d.weight_uniformity) || 85,
            certHash: d.cert_hash || 'pending_cert_hash',
            status: d.status || 'at-pacs',
            createdAt: d.created_at,
            pricePerKg: Number(d.price_per_kg) || 35,
            escrowState: d.escrow_state || 'PENDING',
            paid70: Number(d.paid_70) || 0,
            totalValue: Number(d.total_value) || 0,
          }))
          let lotsToReturn = mapped
          const sim = getSimulationState()
          if (sim && sim.lotEscrowStates) {
            lotsToReturn = lotsToReturn.map((l) => {
              if (sim.lotEscrowStates?.[l.id]) {
                const escrow = sim.lotEscrowStates[l.id]
                return {
                  ...l,
                  escrowState: escrow,
                  status: escrow === 'FULLY_RELEASED' ? 'delivered' : sim.status === 'diverted' ? 'diverted' : l.status,
                  paid70: escrow === 'FULLY_RELEASED'
                    ? l.totalValue
                    : escrow === 'PARTIAL_RELEASED'
                      ? Math.round(l.totalValue * 0.7)
                      : 0,
                }
              }
              return l
            })
          }
          return { lots: lotsToReturn, isLiveDb: true }
        }
        // Connected to Supabase, but lots table is empty — return localLots with live DB status
        let localLotsToReturn = localLots
        const sim = getSimulationState()
        if (sim && sim.lotEscrowStates) {
          localLotsToReturn = localLotsToReturn.map((l) => {
            if (sim.lotEscrowStates?.[l.id]) {
              const escrow = sim.lotEscrowStates[l.id]
              return {
                ...l,
                escrowState: escrow,
                status: escrow === 'FULLY_RELEASED' ? 'delivered' : sim.status === 'diverted' ? 'diverted' : l.status,
                paid70: escrow === 'FULLY_RELEASED'
                  ? l.totalValue
                  : escrow === 'PARTIAL_RELEASED'
                    ? Math.round(l.totalValue * 0.7)
                    : 0,
              }
            }
            return l
          })
        }
        return { lots: localLotsToReturn, isLiveDb: true }
      }
    } catch (err) {
      console.warn('Supabase fetchLots failed, using local store:', err)
    }
  }

  let localFallback = localLots
  const sim = getSimulationState()
  if (sim && sim.lotEscrowStates) {
    localFallback = localFallback.map((l) => {
      if (sim.lotEscrowStates?.[l.id]) {
        const escrow = sim.lotEscrowStates[l.id]
        return {
          ...l,
          escrowState: escrow,
          status: escrow === 'FULLY_RELEASED' ? 'delivered' : sim.status === 'diverted' ? 'diverted' : l.status,
          paid70: escrow === 'FULLY_RELEASED'
            ? l.totalValue
            : escrow === 'PARTIAL_RELEASED'
              ? Math.round(l.totalValue * 0.7)
              : 0,
        }
      }
      return l
    })
  }
  return { lots: localFallback, isLiveDb: false }
}

export async function submitNewLot(lot: {
  id: string
  farmerId: string
  farmerName: string
  farmerNameHi: string
  crop: string
  weightKg: number
  crates: number
  notes?: string
}): Promise<{ success: boolean; isLiveDb: boolean }> {
  const newLotRecord: LotRecord = {
    id: lot.id,
    farmerId: lot.farmerId,
    farmerName: lot.farmerName,
    farmerNameHi: lot.farmerNameHi,
    crop: lot.crop,
    weightKg: lot.weightKg,
    grade: 'B',
    score: 0,
    brixPct: 0,
    blemishPct: 0,
    uniformity: 0,
    certHash: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    pricePerKg: 0,
    escrowState: 'PENDING',
    paid70: 0,
    totalValue: 0,
  }

  localLots = [newLotRecord, ...localLots]

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      let { error } = await supabase.from('lots').insert([
        {
          id: lot.id,
          farmer_name: lot.farmerName,
          farmer_name_hi: lot.farmerNameHi,
          crop_type: lot.crop,
          weight_kg: lot.weightKg,
          status: 'pending',
          escrow_state: 'PENDING',
          price_per_kg: 0,
          total_value: 0,
        },
      ])

      // Fallback if farmer_name column not in schema cache
      if (error && error.message?.includes('farmer_name')) {
        const fallback = await supabase.from('lots').insert([
          {
            id: lot.id,
            crop_type: lot.crop,
            weight_kg: lot.weightKg,
            status: 'pending',
            escrow_state: 'PENDING',
            price_per_kg: 0,
            total_value: 0,
          },
        ])
        error = fallback.error
      }

      if (!error) return { success: true, isLiveDb: true }
      console.warn('Supabase submitNewLot insert warning:', error)
    } catch (e) {
      console.warn('Supabase submitNewLot insert failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}

export async function recordLotGrade(
  lotId: string,
  gradeResult: GradeResult,
  actualWeightKg?: number,
  brixPct?: number,
  blemishPct?: number,
  uniformity?: number
): Promise<{ success: boolean; isLiveDb: boolean }> {
  const price = gradeResult.grade === 'A' ? 40 : gradeResult.grade === 'B' ? 30 : 15
  const newStatus = gradeResult.grade === 'C' ? 'diverted' : 'at-pacs'

  let lotTotalValue = 0

  localLots = localLots.map((l) => {
    if (l.id === lotId) {
      const finalWeight = actualWeightKg || l.weightKg
      const total = finalWeight * price
      lotTotalValue = total
      return {
        ...l,
        weightKg: finalWeight,
        grade: gradeResult.grade,
        score: gradeResult.score,
        brixPct: brixPct ?? l.brixPct,
        blemishPct: blemishPct ?? l.blemishPct,
        uniformity: uniformity ?? l.uniformity,
        certHash: gradeResult.certHash,
        status: newStatus,
        pricePerKg: price,
        totalValue: total,
        paid70: 0, // 70% advance is strictly released when truck is booked, NOT at grading!
        escrowState: 'LOCKED',
      }
    }
    return l
  })

  // Log transition to LOCKED
  await logEscrowTransition(
    lotId,
    'PENDING',
    'LOCKED',
    lotTotalValue,
    `Quality Graded (Grade ${gradeResult.grade}) — 100% Value Locked in Escrow (70% released upon truck booking)`
  )

  saveSimulationState({
    lotEscrowStates: { [lotId]: 'LOCKED' },
  })

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const existing = localLots.find((l) => l.id === lotId)
      const finalWeight = actualWeightKg || existing?.weightKg || 0
      const total = finalWeight * price

      const { error: updateError } = await supabase
        .from('lots')
        .update({
          grade: gradeResult.grade,
          score: gradeResult.score,
          cert_hash: gradeResult.certHash,
          escrow_state: 'LOCKED',
          price_per_kg: price,
          total_value: total,
          paid_70: 0, // 0 until truck booking
          weight_kg: finalWeight,
          brix_pct: brixPct ?? null,
          blemish_pct: blemishPct ?? null,
          weight_uniformity: uniformity ?? null,
          status: newStatus,
        })
        .eq('id', lotId)

      if (updateError) {
        console.warn('Supabase lot update warning:', updateError.message)
      }

      await supabase.from('grade_certificates').insert([
        {
          lot_id: lotId,
          grade: gradeResult.grade,
          score: gradeResult.score,
          cert_hash: gradeResult.certHash,
        },
      ])

      return { success: true, isLiveDb: !updateError }
    } catch (e) {
      console.warn('Supabase recordLotGrade failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}

// ─── 3b. updateLotStatus — for shipping, delivery, diversion ───
export async function updateLotStatus(
  lotId: string,
  status: 'pending' | 'at-pacs' | 'shipped' | 'delivered' | 'diverted'
): Promise<{ success: boolean }> {
  localLots = localLots.map((l) => {
    if (l.id === lotId) {
      const escrowState = status === 'shipped' ? 'PARTIAL_RELEASED' : status === 'delivered' ? 'FULLY_RELEASED' : l.escrowState
      const paid70 = status === 'shipped' ? Math.round(l.totalValue * 0.7) : status === 'delivered' ? l.totalValue : l.paid70
      return { ...l, status, escrowState, paid70 }
    }
    return l
  })
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const lot = localLots.find((l) => l.id === lotId)
      await supabase.from('lots').update({ 
        status,
        ...(lot ? { escrow_state: lot.escrowState, paid_70: lot.paid70 } : {})
      }).eq('id', lotId)
      return { success: true }
    } catch (e) {
      console.warn('updateLotStatus failed:', e)
    }
  }
  return { success: true }
}

// ─── 4. Table: harvest_slots ───────────────────────────────────
export async function fetchHarvestSlots(
  farmerCode = 'f1'
): Promise<{ slot: HarvestSlotRecord; isLiveDb: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('harvest_slots')
        .select('*')
        .eq('farmer_code', farmerCode)
        .single()

      if (!error && data) {
        return {
          slot: {
            id: data.id,
            farmerId: data.farmer_id || 'f1',
            farmerCode: data.farmer_code || farmerCode,
            advisedDate: data.advised_date,
            advice: data.advice,
            priceExpected: Number(data.price_expected),
            cohortId: data.cohort_id,
          },
          isLiveDb: true,
        }
      }
    } catch (e) {
      console.warn('Supabase fetchHarvestSlots failed:', e)
    }
  }

  const found = HARVEST_SLOTS.find((s) => s.farmerId === farmerCode) || HARVEST_SLOTS[0]
  return {
    slot: {
      id: 'hs-1',
      farmerId: found.farmerId,
      farmerCode: found.farmerId,
      advisedDate: found.advisedDate,
      advice: found.advice as 'now' | 'soon' | 'wait',
      priceExpected: found.priceExpected,
      cohortId: 'COHORT-A1-NAGPUR',
    },
    isLiveDb: false,
  }
}

// ─── 5. Table: price_forecasts ─────────────────────────────────
export async function fetchPriceForecasts(
  cropType = 'Orange',
  corridor = 'Nagpur→Mumbai'
): Promise<{ forecasts: any[]; isLiveDb: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('price_forecasts')
        .select('*')
        .eq('crop_type', cropType)
        .order('forecast_date', { ascending: true })

      if (!error && data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          day: new Date(d.forecast_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric' }),
          p10: Number(d.p10),
          p50: Number(d.p50),
          p90: Number(d.p90),
        }))
        return { forecasts: mapped, isLiveDb: true }
      }
    } catch (e) {
      console.warn('Supabase fetchPriceForecasts failed:', e)
    }
  }

  return { forecasts: generatePriceForecast(), isLiveDb: false }
}

// ─── 6. Table: shipments ───────────────────────────────────────
export async function fetchShipments(): Promise<{ shipments: ShipmentRecord[]; isLiveDb: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        const mapped: ShipmentRecord[] = data.map((d: any) => {
          const localMatch = localShipments.find((s) => s.id === d.id)
          return {
            id: d.id,
            lotIds: d.lot_ids || [],
            origin: d.origin,
            destination: d.destination,
            truckId: d.truck_id,
            driverName: d.driver_name,
            driverPhone: d.driver_phone || '',
            totalWeightKg: Number(d.total_weight_kg) || 0,
            totalCrates: d.total_crates || 0,
            blePodId: d.ble_pod_id || 'BLE-POD-8821',
            status: d.status || 'en-route',
            initialShelfLifeHours: d.initial_shelf_life_hours || 240,
            currentLocation: localMatch?.currentLocation || (d.status === 'arrived' ? `${d.destination} (Delivered)` : d.status === 'diverted' ? 'Diverted to Processing Plant' : `${d.origin} → ${d.destination} (In Transit)`),
            progressPct: localMatch?.progressPct ?? (d.status === 'arrived' ? 100 : d.status === 'diverted' ? 100 : 50),
            currentTempC: localMatch?.currentTempC ?? (d.status === 'diverted' ? 16.4 : 5.8),
            divertedTo: localMatch?.divertedTo,
            fundsReleasedPct: localMatch?.fundsReleasedPct ?? (d.status === 'arrived' ? 100 : 70),
            telemetry: localMatch?.telemetry || (d.status === 'diverted' ? generateMockTelemetry(24, 14, 8) : generateMockTelemetry(36, 6.2)),
            createdAt: d.created_at,
          }
        })
        let shipsToReturn = mapped
        const sim = getSimulationState()
        if (sim) {
          shipsToReturn = shipsToReturn.map((s) => {
            if (s.id === sim.shipmentId) {
              return {
                ...s,
                status: sim.status,
                progressPct: sim.progressPct,
                currentLocation: sim.currentLocation,
                currentTempC: sim.currentTemp,
                fundsReleasedPct: sim.fundsReleasedPct,
              }
            }
            return s
          })
        }
        return { shipments: shipsToReturn, isLiveDb: true }
      }
    } catch (e) {
      console.warn('Supabase fetchShipments failed:', e)
    }
  }

  let localShipsToReturn = localShipments
  const sim = getSimulationState()
  if (sim) {
    localShipsToReturn = localShipsToReturn.map((s) => {
      if (s.id === sim.shipmentId) {
        return {
          ...s,
          status: sim.status,
          progressPct: sim.progressPct,
          currentLocation: sim.currentLocation,
          currentTempC: sim.currentTemp,
          fundsReleasedPct: sim.fundsReleasedPct,
        }
      }
      return s
    })
  }
  return { shipments: localShipsToReturn, isLiveDb: false }
}

export async function createShipmentBooking(shipment: {
  id: string
  lotIds: string[]
  origin: string
  destination: string
  truckId: string
  driverName: string
  driverPhone: string
  totalWeightKg: number
  totalCrates: number
  blePodId: string
}): Promise<{ success: boolean; isLiveDb: boolean }> {
  const newShipment: ShipmentRecord = {
    ...shipment,
    status: 'en-route',
    initialShelfLifeHours: 240,
    currentLocation: `${shipment.origin} (Dispatched)`,
    progressPct: 15,
    currentTempC: 5.5,
    fundsReleasedPct: 70,
    telemetry: generateMockTelemetry(36, 5.5),
    createdAt: new Date().toISOString(),
  }

  localShipments = [newShipment, ...localShipments]

  // Update lot status to 'shipped', escrowState to 'PARTIAL_RELEASED', and paid70 to 70% of totalValue
  localLots = localLots.map((l) => {
    if (shipment.lotIds.includes(l.id)) {
      const advance70 = Math.round(l.totalValue * 0.7)
      return {
        ...l,
        status: 'shipped',
        escrowState: 'PARTIAL_RELEASED',
        paid70: advance70,
      }
    }
    return l
  })

  // Log escrow transition: Truck Booking Confirmed -> 70% Farmer Advance Released
  for (const lotId of shipment.lotIds) {
    const lot = localLots.find((l) => l.id === lotId)
    const advance70 = lot?.paid70 || 0
    await logEscrowTransition(
      lotId,
      'LOCKED',
      'PARTIAL_RELEASED',
      advance70,
      `Truck Booking Confirmed (${shipment.truckId}) — 70% Farmer Advance Released to Bank Account`
    )
  }

  // Update simulation state to notify real-time listeners across dashboards
  const newEscrowStates = shipment.lotIds.reduce((acc, id) => ({ ...acc, [id]: 'PARTIAL_RELEASED' as const }), {})
  saveSimulationState({
    shipmentId: shipment.id,
    simStep: 1,
    simScenario: 'safe',
    currentTemp: 5.5,
    currentLocation: `${shipment.origin} (Dispatched)`,
    progressPct: 15,
    status: 'en-route',
    fundsReleasedPct: 70,
    lotEscrowStates: newEscrowStates,
  })

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('shipments').insert([
        {
          id: shipment.id,
          lot_ids: shipment.lotIds,
          origin: shipment.origin,
          destination: shipment.destination,
          truck_id: shipment.truckId,
          driver_name: shipment.driverName,
          driver_phone: shipment.driverPhone,
          total_weight_kg: shipment.totalWeightKg,
          total_crates: shipment.totalCrates,
          ble_pod_id: shipment.blePodId,
          status: 'en-route',
        },
      ])

      // Mark lots as shipped with 70% advance paid in Supabase
      for (const lotId of shipment.lotIds) {
        const lot = localLots.find((l) => l.id === lotId)
        await supabase
          .from('lots')
          .update({
            status: 'shipped',
            escrow_state: 'PARTIAL_RELEASED',
            paid_70: lot?.paid70 || 0,
          })
          .eq('id', lotId)
      }

      if (!error) return { success: true, isLiveDb: true }
    } catch (e) {
      console.warn('Supabase createShipmentBooking failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}

// ─── 6b. Interactive Simulation Functions for Logistics ───────
export interface SimulationState {
  shipmentId: string
  simStep: number
  simScenario: 'safe' | 'excursion'
  currentTemp: number
  currentLocation: string
  progressPct: number
  status: 'loading' | 'en-route' | 'arrived' | 'diverted'
  fundsReleasedPct: number
  lotEscrowStates?: Record<string, 'PENDING' | 'LOCKED' | 'PARTIAL_RELEASED' | 'FULLY_RELEASED'>
  lastUpdated: number
}

const SIM_KEY = 'farmsetu_simulation_state_v2'

export function getSimulationState(): SimulationState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SIM_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('getSimulationState parse error:', e)
  }
  return null
}

export function saveSimulationState(state: Partial<SimulationState>) {
  if (typeof window === 'undefined') return
  try {
    const current = getSimulationState() || {
      shipmentId: 'SH001',
      simStep: 1,
      simScenario: 'safe',
      currentTemp: 5.8,
      currentLocation: 'Karanja Lad Interchange (Km 218 / 780)',
      progressPct: 28,
      status: 'en-route',
      fundsReleasedPct: 70,
      lotEscrowStates: { L001: 'PARTIAL_RELEASED' },
      lastUpdated: Date.now(),
    }
    const merged: SimulationState = {
      ...current,
      ...state,
      lotEscrowStates: {
        ...(current.lotEscrowStates || {}),
        ...(state.lotEscrowStates || {}),
      },
      lastUpdated: Date.now(),
    }
    localStorage.setItem(SIM_KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent('farmsetu_simulation_update', { detail: merged }))
  } catch (e) {
    console.warn('saveSimulationState error:', e)
  }
}

export async function simulateShipmentDelivery(
  shipmentId: string
): Promise<{ success: boolean; isLiveDb: boolean }> {
  localShipments = localShipments.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: 'arrived',
        progressPct: 100,
        currentLocation: `${s.destination} (Geofence Verified)`,
        fundsReleasedPct: 100,
      }
    }
    return s
  })

  const targetShipment = localShipments.find((s) => s.id === shipmentId)
  const lotIds = targetShipment?.lotIds || []

  // Release remaining 30% funds to farmer & mark lots delivered
  localLots = localLots.map((l) => {
    if (lotIds.includes(l.id)) {
      return {
        ...l,
        status: 'delivered',
        escrowState: 'FULLY_RELEASED',
        paid70: l.totalValue,
      }
    }
    return l
  })

  // Log escrow transition
  for (const lotId of lotIds) {
    const lot = localLots.find((l) => l.id === lotId)
    const remainingAmt = lot ? Math.max(0, lot.totalValue - Math.round(lot.totalValue * 0.7)) : 0
    await logEscrowTransition(
      lotId,
      'PARTIAL_RELEASED',
      'FULLY_RELEASED',
      remainingAmt,
      'Buyer Geofence Delivery Confirmation — 30% Final Settlement Released'
    )
  }

  saveSimulationState({
    shipmentId,
    simStep: 4,
    simScenario: 'safe',
    currentTemp: 6.6,
    currentLocation: `${targetShipment?.destination || 'Mumbai Vashi APMC'} (Geofence Verified)`,
    progressPct: 100,
    status: 'arrived',
    fundsReleasedPct: 100,
    lotEscrowStates: lotIds.reduce((acc, id) => ({ ...acc, [id]: 'FULLY_RELEASED' }), {}),
  })

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from('shipments').update({ status: 'arrived' }).eq('id', shipmentId)
      if (lotIds.length > 0) {
        for (const lotId of lotIds) {
          const l = localLots.find((item) => item.id === lotId)
          await supabase
            .from('lots')
            .update({ status: 'delivered', escrow_state: 'FULLY_RELEASED', paid_70: l?.totalValue || 0 })
            .eq('id', lotId)
        }
      }
      return { success: true, isLiveDb: true }
    } catch (e) {
      console.warn('simulateShipmentDelivery failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}

export async function simulateShipmentDiversion(
  shipmentId: string,
  processorName: string,
  bidPricePerKg: number,
  reason: string
): Promise<{ success: boolean; isLiveDb: boolean }> {
  localShipments = localShipments.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: 'diverted',
        progressPct: 100,
        currentLocation: `Diverted to ${processorName} (Salvage Route)`,
        divertedTo: processorName,
        currentTempC: 16.4,
        fundsReleasedPct: 70, // 70% advance guaranteed by PACS
        telemetry: generateMockTelemetry(24, 14, 8),
      }
    }
    return s
  })

  const targetShipment = localShipments.find((s) => s.id === shipmentId)
  const lotIds = targetShipment?.lotIds || []

  // Lots marked diverted
  localLots = localLots.map((l) => {
    if (lotIds.includes(l.id)) {
      return {
        ...l,
        status: 'diverted',
      }
    }
    return l
  })

  for (const lotId of lotIds) {
    const lot = localLots.find((l) => l.id === lotId)
    const salvageVal = (lot?.weightKg || 500) * bidPricePerKg
    await createDiversionOrder({
      shipmentId,
      lotId,
      shelfLifePct: 16,
      reason,
      processorName,
      processorBidPerKg: bidPricePerKg,
      salvageValue: salvageVal,
    })
    await logEscrowTransition(
      lotId,
      'PARTIAL_RELEASED',
      'PARTIAL_RELEASED',
      salvageVal,
      `Processor Diversion to ${processorName} — 70% Farmer Advance Protected by PACS Guarantee`
    )
  }

  saveSimulationState({
    shipmentId,
    simStep: 2,
    simScenario: 'excursion',
    currentTemp: 16.4,
    currentLocation: `Diverted to ${processorName} (Salvage Route)`,
    progressPct: 100,
    status: 'diverted',
    fundsReleasedPct: 70,
    lotEscrowStates: lotIds.reduce((acc, id) => ({ ...acc, [id]: 'PARTIAL_RELEASED' }), {}),
  })

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from('shipments').update({ status: 'diverted' }).eq('id', shipmentId)
      if (lotIds.length > 0) {
        await supabase.from('lots').update({ status: 'diverted' }).in('id', lotIds)
      }
      return { success: true, isLiveDb: true }
    } catch (e) {
      console.warn('simulateShipmentDiversion failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}

export async function updateShipmentProgress(
  shipmentId: string,
  progressPct: number,
  currentTempC: number,
  locationName: string,
  simStep: number = 1,
  scenario: 'safe' | 'excursion' = 'safe'
): Promise<{ success: boolean; isLiveDb?: boolean }> {
  if (simStep === 4) {
    return simulateShipmentDelivery(shipmentId)
  }

  localShipments = localShipments.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: simStep === 0 ? 'loading' : 'en-route',
        progressPct,
        currentTempC,
        currentLocation: locationName,
        fundsReleasedPct: 70,
      }
    }
    return s
  })

  const targetShipment = localShipments.find((s) => s.id === shipmentId)
  const lotIds = targetShipment?.lotIds || []

  // Keep lots at partial released (70% advance)
  localLots = localLots.map((l) => {
    if (lotIds.includes(l.id)) {
      return {
        ...l,
        status: 'shipped',
        escrowState: 'PARTIAL_RELEASED',
        paid70: Math.round(l.totalValue * 0.7),
      }
    }
    return l
  })

  saveSimulationState({
    shipmentId,
    simStep,
    simScenario: scenario,
    currentTemp: currentTempC,
    currentLocation: locationName,
    progressPct,
    status: simStep === 0 ? 'loading' : 'en-route',
    fundsReleasedPct: 70,
    lotEscrowStates: lotIds.reduce((acc, id) => ({ ...acc, [id]: 'PARTIAL_RELEASED' }), {}),
  })

  return { success: true }
}

export async function resetShipmentSimulation(
  shipmentId: string
): Promise<{ success: boolean }> {
  localShipments = localShipments.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: 'en-route',
        progressPct: 28,
        currentTempC: 5.8,
        currentLocation: 'Karanja Lad Interchange (Km 218 / 780)',
        fundsReleasedPct: 70,
        telemetry: generateMockTelemetry(36, 6.2),
      }
    }
    return s
  })

  const target = localShipments.find((s) => s.id === shipmentId)
  if (target?.lotIds) {
    localLots = localLots.map((l) =>
      target.lotIds.includes(l.id)
        ? {
            ...l,
            status: 'shipped',
            escrowState: 'PARTIAL_RELEASED',
            paid70: Math.round(l.totalValue * 0.7),
          }
        : l
    )
  }

  saveSimulationState({
    shipmentId,
    simStep: 1,
    simScenario: 'safe',
    currentTemp: 5.8,
    currentLocation: 'Karanja Lad Interchange (Km 218 / 780)',
    progressPct: 28,
    status: 'en-route',
    fundsReleasedPct: 70,
    lotEscrowStates: target?.lotIds?.reduce((acc, id) => ({ ...acc, [id]: 'PARTIAL_RELEASED' }), {}),
  })

  return { success: true }
}

// ─── 7. Table: telemetry_readings ──────────────────────────────
export async function fetchTelemetryReadings(shipmentId: string): Promise<any[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('telemetry_readings')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('recorded_at', { ascending: true })

      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          timestamp: new Date(d.recorded_at).getTime(),
          tempC: Number(d.temp_c),
        }))
      }
    } catch (e) {
      console.warn('Supabase fetchTelemetryReadings failed:', e)
    }
  }

  return generateMockTelemetry(36, 7)
}

// ─── 8. Table: escrow_transactions ─────────────────────────────
export async function fetchEscrowTransactions(): Promise<{
  transactions: EscrowTransactionRecord[]
  isLiveDb: boolean
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          lotId: d.lot_id,
          fromState: d.from_state,
          toState: d.to_state,
          amount: Number(d.amount),
          triggeredBy: d.triggered_by,
          createdAt: d.created_at,
        }))
        return { transactions: mapped, isLiveDb: true }
      }
    } catch (e) {
      console.warn('Supabase fetchEscrowTransactions failed:', e)
    }
  }

  return { transactions: localEscrow, isLiveDb: false }
}

export async function logEscrowTransition(
  lotId: string,
  fromState: string,
  toState: string,
  amount: number,
  triggeredBy: string
) {
  const record: EscrowTransactionRecord = {
    id: `ESC-${Date.now().toString().slice(-4)}`,
    lotId,
    fromState,
    toState,
    amount,
    triggeredBy,
    createdAt: new Date().toISOString(),
  }
  localEscrow = [record, ...localEscrow]

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from('escrow_transactions').insert([
        {
          lot_id: lotId,
          from_state: fromState,
          to_state: toState,
          amount,
          triggered_by: triggeredBy,
        },
      ])
      await supabase.from('lots').update({ escrow_state: toState }).eq('id', lotId)
    } catch (e) {
      console.warn('Supabase logEscrowTransition failed:', e)
    }
  }
}

// ─── 9. Table: diversion_orders ────────────────────────────────
export async function fetchDiversionOrders(): Promise<{
  orders: DiversionOrderRecord[]
  isLiveDb: boolean
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('diversion_orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        const mapped: DiversionOrderRecord[] = data.map((d: any) => ({
          id: d.id,
          shipmentId: d.shipment_id,
          lotId: d.lot_id || 'L003',
          shelfLifePct: Number(d.shelf_life_pct),
          reason: d.reason,
          processorName: d.processor_name,
          processorBidPerKg: Number(d.processor_bid_per_kg),
          salvageValue: Number(d.salvage_value),
          status: d.status,
          createdAt: d.created_at,
        }))
        return { orders: mapped, isLiveDb: true }
      }
    } catch (e) {
      console.warn('Supabase fetchDiversionOrders failed:', e)
    }
  }

  return { orders: localDiversions, isLiveDb: false }
}

export async function createDiversionOrder(order: {
  shipmentId: string
  lotId: string
  shelfLifePct: number
  reason: string
  processorName: string
  processorBidPerKg: number
  salvageValue: number
}): Promise<{ success: boolean; isLiveDb: boolean }> {
  const newOrder: DiversionOrderRecord = {
    id: `DIV-${Math.floor(100 + Math.random() * 900)}`,
    ...order,
    status: 'accepted',
    createdAt: new Date().toISOString(),
  }
  localDiversions = [newOrder, ...localDiversions]

  // Update lot status to diverted
  localLots = localLots.map((l) =>
    l.id === order.lotId ? { ...l, status: 'diverted' } : l
  )

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('diversion_orders').insert([
        {
          shipment_id: order.shipmentId,
          lot_id: order.lotId,
          shelf_life_pct: order.shelfLifePct,
          reason: order.reason,
          processor_name: order.processorName,
          processor_bid_per_kg: order.processorBidPerKg,
          salvage_value: order.salvageValue,
          status: 'accepted',
        },
      ])

      await supabase.from('lots').update({ status: 'diverted' }).eq('id', order.lotId)
      await supabase.from('shipments').update({ status: 'diverted' }).eq('id', order.shipmentId)

      if (!error) return { success: true, isLiveDb: true }
    } catch (e) {
      console.warn('Supabase createDiversionOrder failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}

// ─── 10. Table: standing_bids (PROCESSOR BIDS) ─────────────────
export async function fetchStandingBids(): Promise<{
  bids: StandingBidRecord[]
  isLiveDb: boolean
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('standing_bids')
        .select('*')
        .order('price_per_kg', { ascending: false })

      if (!error && data && data.length > 0) {
        const mapped: StandingBidRecord[] = data.map((d: any) => ({
          id: d.id,
          processorName: d.processor_name,
          commodity: d.commodity,
          maxDistanceKm: d.max_distance_km,
          pricePerKg: Number(d.price_per_kg),
          capacityTonsPerDay: Number(d.capacity_tons_per_day) || 25,
          contactPhone: d.contact_phone || '+91 712 200000',
          plantLocation: d.plant_location || 'Nagpur Industrial Area',
          isActive: d.is_active !== false,
          createdAt: d.created_at,
        }))
        return { bids: mapped, isLiveDb: true }
      }
    } catch (e) {
      console.warn('Supabase fetchStandingBids failed:', e)
    }
  }

  return { bids: localStandingBids, isLiveDb: false }
}

export async function addStandingBid(bid: {
  processorName: string
  commodity: string
  maxDistanceKm: number
  pricePerKg: number
  capacityTonsPerDay: number
  contactPhone: string
  plantLocation: string
}): Promise<{ success: boolean; isLiveDb: boolean }> {
  const newBid: StandingBidRecord = {
    id: `BID-${Math.floor(100 + Math.random() * 900)}`,
    ...bid,
    isActive: true,
    createdAt: new Date().toISOString(),
  }

  localStandingBids = [newBid, ...localStandingBids]

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('standing_bids').insert([
        {
          processor_name: bid.processorName,
          commodity: bid.commodity,
          max_distance_km: bid.maxDistanceKm,
          price_per_kg: bid.pricePerKg,
          capacity_tons_per_day: bid.capacityTonsPerDay,
          contact_phone: bid.contactPhone,
          plant_location: bid.plantLocation,
          is_active: true,
        },
      ])

      if (!error) return { success: true, isLiveDb: true }
    } catch (e) {
      console.warn('Supabase addStandingBid failed:', e)
    }
  }

  return { success: true, isLiveDb: false }
}
