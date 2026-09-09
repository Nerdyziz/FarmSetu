// lib/arrhenius.ts
// Arrhenius shelf-life calculation for oranges
// k(T) = A * exp(-Ea / (R * T))
// remaining_life_fraction = exp(-k_actual * elapsed / k_ref * initial_life)

export interface TelemetryReading {
  timestamp: number // unix ms
  tempC: number
}

// Orange kinetic parameters (representative values)
const Ea = 80000  // Activation energy J/mol (oranges ~75–85 kJ/mol)
const R = 8.314   // Universal gas constant J/(mol·K)
const A = 1e12    // Pre-exponential factor (s⁻¹)
const T_REF_C = 5 // Reference temperature °C (pre-cooled baseline)

function kAtTemp(tempC: number): number {
  const T = tempC + 273.15
  return A * Math.exp(-Ea / (R * T))
}

const k_ref = kAtTemp(T_REF_C)

/**
 * Given an array of telemetry readings and the initial shelf-life in hours,
 * returns the remaining shelf-life fraction (0–1) and hours remaining.
 */
export function calcShelfLife(
  readings: TelemetryReading[],
  initialShelfLifeHours = 240 // 10 days default for oranges
): { fractionRemaining: number; hoursRemaining: number; status: 'safe' | 'at-risk' | 'diverted' } {
  if (readings.length === 0) {
    return { fractionRemaining: 1, hoursRemaining: initialShelfLifeHours, status: 'safe' }
  }

  // Sort by time
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp)

  let consumedEquivalentHours = 0
  for (let i = 1; i < sorted.length; i++) {
    const dt = (sorted[i].timestamp - sorted[i - 1].timestamp) / 3_600_000 // hours
    const tempC = sorted[i - 1].tempC
    const k = kAtTemp(tempC)
    // Equivalent hours at reference temperature
    consumedEquivalentHours += dt * (k / k_ref)
  }

  const hoursRemaining = Math.max(0, initialShelfLifeHours - consumedEquivalentHours)
  const fractionRemaining = hoursRemaining / initialShelfLifeHours

  const status =
    fractionRemaining > 0.4 ? 'safe' : fractionRemaining > 0.2 ? 'at-risk' : 'diverted'

  return { fractionRemaining, hoursRemaining, status }
}

/**
 * Generate mock telemetry for demo (simulates 15-min BLE pings)
 */
export function generateMockTelemetry(
  hours = 48,
  baseTemp = 8,
  excursionAt?: number // hour index where temp spike occurs
): TelemetryReading[] {
  const readings: TelemetryReading[] = []
  const now = Date.now()
  const intervals = hours * 4 // 15-min intervals

  for (let i = intervals; i >= 0; i--) {
    const ts = now - i * 15 * 60_000
    let temp = baseTemp + (Math.random() - 0.5) * 2
    if (excursionAt !== undefined && i >= excursionAt - 4 && i <= excursionAt) {
      temp += 12 // simulate cold chain break
    }
    readings.push({ timestamp: ts, tempC: parseFloat(temp.toFixed(1)) })
  }
  return readings
}
