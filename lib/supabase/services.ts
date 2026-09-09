import { createClient, isSupabaseConfigured } from './client'
import {
  MOCK_LOTS,
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
// ─── Browser-Scoped Local Persistent Storage Keys ─────────────
const STORAGE_LOTS_KEY = 'farmsetu_browser_lots_v4'
const STORAGE_SHIPMENTS_KEY = 'farmsetu_browser_shipments_v4'
const STORAGE_BIDS_KEY = 'farmsetu_browser_bids_v4'
const STORAGE_ESCROW_KEY = 'farmsetu_browser_escrow_v4'
const STORAGE_DIVERSIONS_KEY = 'farmsetu_browser_diversions_v4'
const STORAGE_SESSION_KEY = 'farmsetu_browser_session_id'

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

const INITIAL_SHIPMENTS: ShipmentRecord[] = [
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

let localShipments: ShipmentRecord[] = [...INITIAL_SHIPMENTS]

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

// ─── Browser-Scoped Storage Accessors ──────────────────────────
export function getBrowserSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let sess = localStorage.getItem(STORAGE_SESSION_KEY)
    if (!sess) {
      sess = 'sess_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36)
      localStorage.setItem(STORAGE_SESSION_KEY, sess)
    }
    return sess
  } catch {
    return 'fallback_session'
  }
}

export function getStoredLots(): LotRecord[] {
  if (typeof window === 'undefined') return localLots
  try {
    const raw = localStorage.getItem(STORAGE_LOTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        localLots = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('getStoredLots parse error:', e)
  }
  localLots = [...MOCK_LOTS]
  setStoredLots(localLots)
  return localLots
}

export function setStoredLots(lots: LotRecord[]) {
  localLots = lots
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_LOTS_KEY, JSON.stringify(lots))
      window.dispatchEvent(new CustomEvent('farmsetu_lots_updated', { detail: lots }))
    } catch (e) {
      console.warn('setStoredLots error:', e)
    }
  }
}

export function getStoredShipments(): ShipmentRecord[] {
  if (typeof window === 'undefined') return localShipments
  try {
    const raw = localStorage.getItem(STORAGE_SHIPMENTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        localShipments = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('getStoredShipments parse error:', e)
  }
  localShipments = [...INITIAL_SHIPMENTS]
  setStoredShipments(localShipments)
  return localShipments
}

export function setStoredShipments(shipments: ShipmentRecord[]) {
  localShipments = shipments
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_SHIPMENTS_KEY, JSON.stringify(shipments))
      window.dispatchEvent(new CustomEvent('farmsetu_shipments_updated', { detail: shipments }))
    } catch (e) {
      console.warn('setStoredShipments error:', e)
    }
  }
}

export function getStoredStandingBids(): StandingBidRecord[] {
  if (typeof window === 'undefined') return localStandingBids
  try {
    const raw = localStorage.getItem(STORAGE_BIDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStandingBids = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('getStoredStandingBids parse error:', e)
  }
  setStoredStandingBids(localStandingBids)
  return localStandingBids
}

export function setStoredStandingBids(bids: StandingBidRecord[]) {
  localStandingBids = bids
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_BIDS_KEY, JSON.stringify(bids))
      window.dispatchEvent(new CustomEvent('farmsetu_bids_updated', { detail: bids }))
    } catch (e) {
      console.warn('setStoredStandingBids error:', e)
    }
  }
}

export function getStoredEscrow(): EscrowTransactionRecord[] {
  if (typeof window === 'undefined') return localEscrow
  try {
    const raw = localStorage.getItem(STORAGE_ESCROW_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        localEscrow = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('getStoredEscrow parse error:', e)
  }
  setStoredEscrow(localEscrow)
  return localEscrow
}

export function setStoredEscrow(escrow: EscrowTransactionRecord[]) {
  localEscrow = escrow
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_ESCROW_KEY, JSON.stringify(escrow))
      window.dispatchEvent(new CustomEvent('farmsetu_escrow_updated', { detail: escrow }))
    } catch (e) {
      console.warn('setStoredEscrow error:', e)
    }
  }
}

export function getStoredDiversions(): DiversionOrderRecord[] {
  if (typeof window === 'undefined') return localDiversions
  try {
    const raw = localStorage.getItem(STORAGE_DIVERSIONS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        localDiversions = parsed
        return parsed
      }
    }
  } catch (e) {
    console.warn('getStoredDiversions parse error:', e)
  }
  setStoredDiversions(localDiversions)
  return localDiversions
}

export function setStoredDiversions(orders: DiversionOrderRecord[]) {
  localDiversions = orders
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_DIVERSIONS_KEY, JSON.stringify(orders))
      window.dispatchEvent(new CustomEvent('farmsetu_diversions_updated', { detail: orders }))
    } catch (e) {
      console.warn('setStoredDiversions error:', e)
    }
  }
}

export function resetBrowserStorage() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_LOTS_KEY)
    localStorage.removeItem(STORAGE_SHIPMENTS_KEY)
    localStorage.removeItem(STORAGE_BIDS_KEY)
    localStorage.removeItem(STORAGE_ESCROW_KEY)
    localStorage.removeItem(STORAGE_DIVERSIONS_KEY)
    localStorage.removeItem(SIM_KEY)
    localLots = [...MOCK_LOTS]
    localShipments = [...INITIAL_SHIPMENTS]
    setStoredLots(localLots)
    setStoredShipments(localShipments)
    window.dispatchEvent(new CustomEvent('farmsetu_lots_updated', { detail: localLots }))
    window.dispatchEvent(new CustomEvent('farmsetu_simulation_update', { detail: null }))
  } catch (e) {
    console.warn('resetBrowserStorage error:', e)
  }
}

// ─── 2. Table: lots ─────────────────────────────────────────────
export async function fetchLots(): Promise<{ lots: LotRecord[]; isLiveDb: boolean }> {
  // 1. Always load the persistent lots for THIS browser from localStorage
  let lotsToReturn = getStoredLots()

  // 2. Apply active simulation state overlay
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

  // 3. Confirm live Supabase connection status
  let isDb = false
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('lots').select('id').limit(1)
      if (!error) isDb = true
    } catch {
      isDb = false
    }
  }

  return { lots: lotsToReturn, isLiveDb: isDb }
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

  // 1. Immediately persist in this browser's local store
  const currentLots = getStoredLots()
  setStoredLots([newLotRecord, ...currentLots])

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

  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) => {
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
  setStoredLots(updatedLots)

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
      const existing = updatedLots.find((l) => l.id === lotId)
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
  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) => {
    if (l.id === lotId) {
      const escrowState = status === 'shipped' ? 'PARTIAL_RELEASED' : status === 'delivered' ? 'FULLY_RELEASED' : l.escrowState
      const paid70 = status === 'shipped' ? Math.round(l.totalValue * 0.7) : status === 'delivered' ? l.totalValue : l.paid70
      return { ...l, status, escrowState, paid70 }
    }
    return l
  })
  setStoredLots(updatedLots)

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const lot = updatedLots.find((l) => l.id === lotId)
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
        return {
          forecasts: data.map((d: any) => ({
            day: d.forecast_date,
            p10: d.p10_price,
            p50: d.p50_price,
            p90: d.p90_price,
          })),
          isLiveDb: true,
        }
      }
    } catch (e) {
      console.warn('Supabase price_forecasts failed:', e)
    }
  }

  return { forecasts: generatePriceForecast(), isLiveDb: false }
}

// ─── 6. Table: shipments ───────────────────────────────────────
export async function fetchShipments(): Promise<{ shipments: ShipmentRecord[]; isLiveDb: boolean }> {
  let shipsToReturn = getStoredShipments()
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

  let isDb = false
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('shipments').select('id').limit(1)
      if (!error) isDb = true
    } catch {
      isDb = false
    }
  }

  return { shipments: shipsToReturn, isLiveDb: isDb }
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

  // 1. Immediately persist in browser shipments
  const currentShips = getStoredShipments()
  setStoredShipments([newShipment, ...currentShips])

  // 2. Update lot status to 'shipped', escrowState to 'PARTIAL_RELEASED', and paid70 to 70% of totalValue
  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) => {
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
  setStoredLots(updatedLots)

  // 3. Log escrow transition: Truck Booking Confirmed -> 70% Farmer Advance Released
  for (const lotId of shipment.lotIds) {
    const lot = updatedLots.find((l) => l.id === lotId)
    const advance70 = lot?.paid70 || 0
    await logEscrowTransition(
      lotId,
      'LOCKED',
      'PARTIAL_RELEASED',
      advance70,
      `Truck Booking Confirmed (${shipment.truckId}) — 70% Farmer Advance Released to Bank Account`
    )
  }

  // 4. Update simulation state to notify real-time listeners across dashboards
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

  // 5. Update Supabase if configured
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
        const lot = updatedLots.find((l) => l.id === lotId)
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
  const currentShips = getStoredShipments()
  const updatedShips = currentShips.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: 'arrived' as const,
        progressPct: 100,
        currentLocation: `${s.destination} (Geofence Verified)`,
        fundsReleasedPct: 100,
      }
    }
    return s
  })
  setStoredShipments(updatedShips)

  const targetShipment = updatedShips.find((s) => s.id === shipmentId)
  const lotIds = targetShipment?.lotIds || []

  // Release remaining 30% funds to farmer & mark lots delivered
  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) => {
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
  setStoredLots(updatedLots)

  // Log escrow transition
  for (const lotId of lotIds) {
    const lot = updatedLots.find((l) => l.id === lotId)
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
          const l = updatedLots.find((item) => item.id === lotId)
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
  const currentShips = getStoredShipments()
  const updatedShips = currentShips.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: 'diverted' as const,
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
  setStoredShipments(updatedShips)

  const targetShipment = updatedShips.find((s) => s.id === shipmentId)
  const lotIds = targetShipment?.lotIds || []

  // Lots marked diverted
  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) => {
    if (lotIds.includes(l.id)) {
      return {
        ...l,
        status: 'diverted',
      }
    }
    return l
  })
  setStoredLots(updatedLots)

  for (const lotId of lotIds) {
    const lot = updatedLots.find((l) => l.id === lotId)
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

  const currentShips = getStoredShipments()
  const updatedShips = currentShips.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: simStep === 0 ? ('loading' as const) : ('en-route' as const),
        progressPct,
        currentTempC,
        currentLocation: locationName,
        fundsReleasedPct: 70,
      }
    }
    return s
  })
  setStoredShipments(updatedShips)

  const targetShipment = updatedShips.find((s) => s.id === shipmentId)
  const lotIds = targetShipment?.lotIds || []

  // Keep lots at partial released (70% advance)
  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) => {
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
  setStoredLots(updatedLots)

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
  const currentShips = getStoredShipments()
  const updatedShips = currentShips.map((s) => {
    if (s.id === shipmentId) {
      return {
        ...s,
        status: 'en-route' as const,
        progressPct: 28,
        currentTempC: 5.8,
        currentLocation: 'Karanja Lad Interchange (Km 218 / 780)',
        fundsReleasedPct: 70,
        telemetry: generateMockTelemetry(36, 6.2),
      }
    }
    return s
  })
  setStoredShipments(updatedShips)

  const target = updatedShips.find((s) => s.id === shipmentId)
  if (target?.lotIds) {
    const currentLots = getStoredLots()
    const updatedLots = currentLots.map((l) =>
      target.lotIds.includes(l.id)
        ? {
            ...l,
            status: 'shipped',
            escrowState: 'PARTIAL_RELEASED',
            paid70: Math.round(l.totalValue * 0.7),
          }
        : l
    )
    setStoredLots(updatedLots)
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
  const transactions = getStoredEscrow()
  return { transactions, isLiveDb: isSupabaseConfigured() }
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
  const current = getStoredEscrow()
  setStoredEscrow([record, ...current])

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
  const orders = getStoredDiversions()
  return { orders, isLiveDb: isSupabaseConfigured() }
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
  const current = getStoredDiversions()
  setStoredDiversions([newOrder, ...current])

  // Update lot status to diverted in browser store
  const currentLots = getStoredLots()
  const updatedLots = currentLots.map((l) =>
    l.id === order.lotId ? { ...l, status: 'diverted' } : l
  )
  setStoredLots(updatedLots)

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      await supabase.from('diversion_orders').insert([
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

      return { success: true, isLiveDb: true }
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
  const bids = getStoredStandingBids()
  return { bids, isLiveDb: isSupabaseConfigured() }
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

  const current = getStoredStandingBids()
  setStoredStandingBids([newBid, ...current])

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

