import { NextRequest, NextResponse } from 'next/server'
import { calcShelfLife, TelemetryReading } from '@/lib/arrhenius'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { readings, initialShelfLifeHours } = body as {
      readings: TelemetryReading[]
      initialShelfLifeHours?: number
    }

    if (!readings || !Array.isArray(readings)) {
      return NextResponse.json({ error: 'readings array required' }, { status: 400 })
    }

    const result = calcShelfLife(readings, initialShelfLifeHours ?? 240)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Calculation failed' }, { status: 500 })
  }
}
