// lib/mock-data.ts
// Demo data — app works fully without Supabase connected

import { generateMockTelemetry } from './arrhenius'

export const MOCK_FARMERS = [
  { id: 'f1', name: 'Ramesh Patil', nameHi: 'रमेश पाटिल', village: 'Nagpur', crop: 'Orange', totalKg: 800 },
  { id: 'f2', name: 'Sunita Devi', nameHi: 'सुनीता देवी', village: 'Wardha', crop: 'Orange', totalKg: 450 },
  { id: 'f3', name: 'Balu Shinde', nameHi: 'बालू शिंदे', village: 'Amravati', crop: 'Orange', totalKg: 620 },
]

export const MOCK_LOTS = [
  {
    id: 'L001',
    farmerId: 'f1',
    farmerName: 'Ramesh Patil',
    farmerNameHi: 'रमेश पाटिल',
    crop: 'Orange',
    weightKg: 800,
    grade: 'A' as const,
    score: 84,
    brixPct: 12.5,
    blemishPct: 3.2,
    uniformity: 91,
    certHash: 'a3f7c2e1d4b89f560a3f7c2e1d4b89f560a3f7c2e1d4b89f560a3f7c2e1d4b8',
    status: 'shipped',
    createdAt: '2026-09-07T08:00:00Z',
    pricePerKg: 38,
    escrowState: 'PARTIAL_RELEASED',
    paid70: 21280,
    totalValue: 30400,
  },
  {
    id: 'L002',
    farmerId: 'f2',
    farmerName: 'Sunita Devi',
    farmerNameHi: 'सुनीता देवी',
    crop: 'Orange',
    weightKg: 450,
    grade: 'B' as const,
    score: 61,
    brixPct: 9.1,
    blemishPct: 9.8,
    uniformity: 78,
    certHash: 'b1e2f3a4c5d6e7f8b1e2f3a4c5d6e7f8b1e2f3a4c5d6e7f8b1e2f3a4c5d6e7f8',
    status: 'at-pacs',
    createdAt: '2026-09-08T10:30:00Z',
    pricePerKg: 28,
    escrowState: 'LOCKED',
    paid70: 0,
    totalValue: 12600,
  },
  {
    id: 'L003',
    farmerId: 'f3',
    farmerName: 'Balu Shinde',
    farmerNameHi: 'बालू शिंदे',
    crop: 'Orange',
    weightKg: 620,
    grade: 'C' as const,
    score: 38,
    brixPct: 6.8,
    blemishPct: 22.5,
    uniformity: 65,
    certHash: 'c9d8e7f6a5b4c3d2c9d8e7f6a5b4c3d2c9d8e7f6a5b4c3d2c9d8e7f6a5b4c3d2',
    status: 'diverted',
    createdAt: '2026-09-08T06:00:00Z',
    pricePerKg: 15,
    escrowState: 'LOCKED',
    paid70: 0,
    totalValue: 9300,
  },
  {
    id: 'L004',
    farmerId: 'f1',
    farmerName: 'Ramesh Patil',
    farmerNameHi: 'रमेश पाटिल',
    crop: 'Orange',
    weightKg: 380,
    grade: 'A' as const,
    score: 91,
    brixPct: 13.2,
    blemishPct: 1.8,
    uniformity: 95,
    certHash: 'd4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1d4e5f6a7b8c9d0e1',
    status: 'delivered',
    createdAt: '2026-09-06T07:00:00Z',
    pricePerKg: 42,
    escrowState: 'FULLY_RELEASED',
    paid70: 11172,
    totalValue: 15960,
  },
]

export const MOCK_SHIPMENTS = [
  {
    id: 'SH001',
    lotId: 'L001',
    origin: 'Nagpur PACS',
    destination: 'Mumbai B2B Hub',
    telemetry: generateMockTelemetry(36, 7),
    initialShelfLifeHours: 240,
    truckId: 'MH-31-AB-4521',
    driverName: 'Suresh Kumar',
    status: 'en-route',
  },
  {
    id: 'SH002',
    lotId: 'L003',
    origin: 'Amravati PACS',
    destination: 'Nagpur Juice Plant',
    telemetry: generateMockTelemetry(24, 14, 8),
    initialShelfLifeHours: 240,
    truckId: 'MH-31-CD-7823',
    driverName: 'Raju Bhai',
    status: 'diverted',
  },
]

export const MOCK_ORDERS = [
  {
    id: 'ORD001',
    buyerId: 'b1',
    buyerName: 'FreshMart Mumbai',
    lotId: 'L001',
    lotGrade: 'A',
    pricePerKg: 38,
    totalKg: 800,
    totalValue: 30400,
    escrowState: 'PARTIAL_RELEASED',
    placedAt: '2026-09-07T09:00:00Z',
    deliveryStatus: 'en-route',
  },
  {
    id: 'ORD002',
    buyerId: 'b2',
    buyerName: 'Kirana B2B Pune',
    lotId: 'L004',
    lotGrade: 'A',
    pricePerKg: 42,
    totalKg: 380,
    totalValue: 15960,
    escrowState: 'FULLY_RELEASED',
    placedAt: '2026-09-06T08:00:00Z',
    deliveryStatus: 'delivered',
  },
]

// 30-day price forecast with P10/P50/P90 bands
export function generatePriceForecast() {
  const data = []
  const today = new Date()
  const BASE = 35
  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const label = `${d.getDate()}/${d.getMonth() + 1}`
    const trend = Math.sin(i / 5) * 3
    const noise = (Math.random() - 0.5) * 4
    const p50 = Math.round(BASE + trend + noise)
    data.push({
      day: label,
      p10: Math.max(20, p50 - 8 - Math.random() * 3),
      p50,
      p90: p50 + 8 + Math.random() * 4,
    })
  }
  return data
}

// Arrival data (simulated mandi arrivals in tons)
export function generateArrivalData() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 13 + i)
    return {
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      nagpur: Math.round(80 + Math.random() * 60),
      wardha: Math.round(30 + Math.random() * 25),
      amravati: Math.round(50 + Math.random() * 40),
    }
  })
}

// Harvest slot advisories per farmer cohort
export const HARVEST_SLOTS = [
  { farmerId: 'f1', advisedDate: '2026-09-11', advice: 'now', priceExpected: 40 },
  { farmerId: 'f2', advisedDate: '2026-09-14', advice: 'wait', priceExpected: 33 },
  { farmerId: 'f3', advisedDate: '2026-09-12', advice: 'soon', priceExpected: 36 },
]

export const GRADE_SUMMARY = [
  { name: 'Grade A', value: 18, fill: '#16a34a' },
  { name: 'Grade B', value: 11, fill: '#ca8a04' },
  { name: 'Grade C', value: 5, fill: '#dc2626' },
]

export const CORRIDOR_STATS = {
  activeFarmers: 312,
  totalVolumeTons: 48.6,
  avgFarmerSharePct: 71,
  spoilageRatePct: 14.2,
  escrowSettled: 847600,
}
