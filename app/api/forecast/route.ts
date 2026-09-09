import { NextResponse } from 'next/server'
import { generatePriceForecast } from '@/lib/mock-data'

export async function GET() {
  const forecast = generatePriceForecast()
  return NextResponse.json({ forecast, crop: 'Orange', corridor: 'Nagpur→Mumbai' })
}
